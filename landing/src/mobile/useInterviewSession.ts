import { useCallback, useEffect, useRef, useState } from 'react'
import { minCharsForDetection } from './answerRouting'
import { transcribeAudioBlob } from './cloudStt'
import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileIsReady } from './profileTypes'
import { getActiveApiKey } from './profileStorage'
import { speechLangFromSettings } from './providerRegistry'
import {
  createSpeechRecognition,
  requestInterviewAnswer,
  speechRecognitionAvailable,
  type SessionPhase,
} from './interviewTypes'

function effectiveMinChars(settings: AppSettings): number {
  const base = minCharsForDetection(settings.questionDetection)
  if (settings.micSensitivity === 'boost') return Math.max(8, Math.floor(base * 0.65))
  return base
}

export function useInterviewSession(profile: PersonalProfile, settings: AppSettings) {
  const [phase, setPhase] = useState<SessionPhase>('home')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [thinkMode, setThinkMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const cloudTranscribingRef = useRef(false)
  const generatingRef = useRef(false)
  const lastFinalRef = useRef('')
  const transcriptRef = useRef('')
  const answerEndRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const scrollAnswer = useCallback(() => {
    if (!settings.autoScroll) return
    requestAnimationFrame(() => {
      answerEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [settings.autoScroll])

  const appendTranscript = useCallback(
    (chunk: string, opts?: { autoAnswer?: boolean }) => {
      const piece = String(chunk || '').trim()
      if (!piece) return
      const merged = `${transcriptRef.current} ${piece}`.trim()
      transcriptRef.current = merged
      setTranscript(merged)
      setInterimTranscript('')
      lastFinalRef.current = piece
      const s = settingsRef.current
      if (opts?.autoAnswer && s.autoAnswer && piece.length >= effectiveMinChars(s)) {
        void generateFromTextRef.current?.(piece, { source: 'transcript' })
      }
    },
    [],
  )

  const generateFromTextRef = useRef<
    (q: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript' }) => Promise<void>
  >()

  const generateFromText = useCallback(
    async (question: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript' }) => {
      const q = String(question || '').trim()
      if (!q || generatingRef.current) return
      if (!getActiveApiKey(settings)) {
        setError('Add your API key in Settings → AI Providers.')
        return
      }
      generatingRef.current = true
      setIsGenerating(true)
      setError(null)
      try {
        const text = await requestInterviewAnswer({
          question: q,
          profile,
          settings,
          think: thinkMode,
          source: opts?.source || 'manual_input',
        })
        setAnswer(text)
        scrollAnswer()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Generation failed'
        setError(msg)
        if (!opts?.manual) console.warn('[interview]', msg)
      } finally {
        generatingRef.current = false
        setIsGenerating(false)
        setStarting(false)
      }
    },
    [profile, settings, thinkMode, scrollAnswer],
  )
  generateFromTextRef.current = generateFromText

  const stopCloudCapture = useCallback(() => {
    const recorder = mediaRecorderRef.current
    mediaRecorderRef.current = null
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* ignore */
      }
    }
    const stream = mediaStreamRef.current
    mediaStreamRef.current = null
    if (stream) stream.getTracks().forEach((t) => t.stop())
  }, [])

  const stopRecognition = useCallback(() => {
    stopCloudCapture()
    const rec = recognitionRef.current
    recognitionRef.current = null
    if (rec) {
      try {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }, [stopCloudCapture])

  const startCloudCapture = useCallback(async () => {
    stopCloudCapture()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: settings.micSensitivity === 'boost',
        },
      })
      mediaStreamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size < 1200 || cloudTranscribingRef.current) return
        cloudTranscribingRef.current = true
        setInterimTranscript('Listening…')
        try {
          const text = await transcribeAudioBlob(settingsRef.current, event.data)
          appendTranscript(text, { autoAnswer: true })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Cloud transcription failed'
          console.warn('[stt]', msg)
        } finally {
          cloudTranscribingRef.current = false
          setInterimTranscript('')
        }
      }

      recorder.onerror = () => setError('Microphone recording error.')

      recorder.start(4500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone permission denied')
    }
  }, [appendTranscript, stopCloudCapture, settings.micSensitivity])

  const startDeviceRecognition = useCallback(() => {
    if (!speechRecognitionAvailable()) {
      setError('On-device speech recognition unavailable. Try Cloud API in Settings → Audio.')
      return
    }

    try {
      const lang = speechLangFromSettings(settings.micListenLanguage)
      const recognition = createSpeechRecognition(lang)
      recognitionRef.current = recognition
      const minChars = effectiveMinChars(settings)

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let finalChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || ''
          if (event.results[i].isFinal) finalChunk += piece
          else interim += piece
        }
        if (interim) setInterimTranscript(interim.trim())
        if (finalChunk.trim()) {
          appendTranscript(finalChunk.trim())
          if (settings.autoAnswer && finalChunk.trim().length >= minChars) {
            void generateFromText(finalChunk.trim(), { source: 'transcript' })
          }
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return
        setError(`Microphone error: ${event.error}`)
      }

      recognition.onend = () => {
        if (sessionActive && recognitionRef.current === recognition) {
          try {
            recognition.start()
          } catch {
            /* restart may fail if user stopped */
          }
        }
      }

      recognition.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech recognition failed to start')
    }
  }, [
    appendTranscript,
    generateFromText,
    sessionActive,
    settings.autoAnswer,
    settings.micListenLanguage,
    settings.micSensitivity,
    settings.questionDetection,
  ])

  const startRecognition = useCallback(() => {
    stopRecognition()
    if (!settings.audioEnabled) return

    if (settings.sttMode === 'cloud') {
      void startCloudCapture()
      return
    }
    startDeviceRecognition()
  }, [
    stopRecognition,
    settings.audioEnabled,
    settings.sttMode,
    startCloudCapture,
    startDeviceRecognition,
  ])

  const startSession = useCallback(() => {
    if (!profileIsReady(profile)) {
      setError('Add your resume in Settings → Personal Info first.')
      return
    }
    if (!getActiveApiKey(settings)) {
      setError('Add your API key in Settings → AI Providers.')
      return
    }
    setError(null)
    setSessionActive(true)
    setStarting(true)
    setTranscript('')
    transcriptRef.current = ''
    setInterimTranscript('')
    setAnswer('')
    lastFinalRef.current = ''
    setPhase('interview')
    startRecognition()
    setTimeout(() => setStarting(false), 1200)
  }, [profile, settings, startRecognition])

  const stopSession = useCallback(() => {
    setSessionActive(false)
    stopRecognition()
    setInterimTranscript('')
    setStarting(false)
    setPhase('home')
  }, [stopRecognition])

  const assistNow = useCallback(() => {
    const q = `${transcript} ${interimTranscript}`.trim() || lastFinalRef.current
    if (!q) {
      setError('No speech detected yet. Speak a question, then tap Assist.')
      return
    }
    void generateFromText(q, { manual: true, source: 'transcript' })
  }, [transcript, interimTranscript, generateFromText])

  const newQuestion = useCallback(() => {
    setTranscript('')
    transcriptRef.current = ''
    setInterimTranscript('')
    setAnswer('')
    lastFinalRef.current = ''
    setError(null)
    if (sessionActive && settings.audioEnabled) startRecognition()
  }, [sessionActive, settings.audioEnabled, startRecognition])

  const sendTypedQuestion = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q) return
      setTranscript(q)
      setInterimTranscript('')
      void generateFromText(q, { manual: true, source: 'manual_input' })
    },
    [generateFromText],
  )

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    return () => stopRecognition()
  }, [stopRecognition])

  const displayTranscript =
    `${transcript}${interimTranscript ? (transcript ? ' ' : '') + interimTranscript : ''}`.trim()

  return {
    phase,
    transcript: displayTranscript,
    answer,
    thinkMode,
    setThinkMode,
    error,
    sessionActive,
    starting,
    startSession,
    stopSession,
    assistNow,
    newQuestion,
    sendTypedQuestion,
    answerEndRef,
    isGenerating,
    clearError,
  }
}
