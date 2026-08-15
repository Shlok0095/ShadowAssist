import { useCallback, useEffect, useRef, useState } from 'react'
import { minCharsForDetection } from './answerRouting'
import { transcribeAudioBlob } from './cloudStt'
import { connectDeepgramLive, type DeepgramLiveHandle } from './deepgramLiveStt'
import { startPcmStreamCapture } from './pcmStreamCapture'
import { isLikelySttGarbage, isPlausibleInterviewUtterance } from './sttGarbage'
import { startUtteranceVadCapture } from './utteranceVadCapture'
import { mergeCumulativeFinal } from './transcriptMerge'
import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileIsReady, profileToContextText } from './profileTypes'
import { getActiveApiKey, loadProfile } from './profileStorage'
import { speechLangFromSettings } from './providerRegistry'
import { sttKeyConfigured } from './sttRegistry'
import {
  createSpeechRecognition,
  requestInterviewAnswer,
  speechRecognitionAvailable,
  type SessionPhase,
} from './interviewTypes'

const SESSION_WARMUP_MS = 1500
const AUTO_ANSWER_DELAY_MS = 1400
const MIN_AUDIO_BYTES = 800

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
  const [startingMessage, setStartingMessage] = useState('Starting…')
  const [isGenerating, setIsGenerating] = useState(false)
  const [listeningStatus, setListeningStatus] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const deepgramLiveRef = useRef<DeepgramLiveHandle | null>(null)
  const pcmStreamRef = useRef<{ stop: () => void } | null>(null)
  const utteranceVadRef = useRef<{ stop: () => void } | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const transcribeQueueRef = useRef<Blob[]>([])
  const transcribeBusyRef = useRef(false)
  const generatingRef = useRef(false)
  const lastDeviceFinalRef = useRef('')
  const transcriptRef = useRef('')
  const answerEndRef = useRef<HTMLDivElement | null>(null)
  const autoAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef(settings)
  const profileRef = useRef(profile)
  const sessionStartedAtRef = useRef(0)
  const sttHealthyRef = useRef(false)
  settingsRef.current = settings
  profileRef.current = profile

  const scrollAnswer = useCallback(() => {
    if (!settingsRef.current.autoScroll) return
    requestAnimationFrame(() => {
      answerEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  const clearAutoAnswerTimer = useCallback(() => {
    if (autoAnswerTimerRef.current) {
      clearTimeout(autoAnswerTimerRef.current)
      autoAnswerTimerRef.current = null
    }
  }, [])

  const generateFromTextRef = useRef<
    (q: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript' }) => Promise<void>
  >()

  const scheduleAutoAnswer = useCallback(() => {
    clearAutoAnswerTimer()
    autoAnswerTimerRef.current = setTimeout(() => {
      autoAnswerTimerRef.current = null
      const merged = transcriptRef.current.trim()
      const s = settingsRef.current
      const warmedUp = Date.now() - sessionStartedAtRef.current >= SESSION_WARMUP_MS
      if (
        !warmedUp ||
        !sttHealthyRef.current ||
        !s.autoAnswer ||
        generatingRef.current ||
        merged.length < effectiveMinChars(s) ||
        !isPlausibleInterviewUtterance(merged)
      ) {
        return
      }
      void generateFromTextRef.current?.(merged, { source: 'transcript' })
    }, AUTO_ANSWER_DELAY_MS)
  }, [clearAutoAnswerTimer])

  /** Replace current utterance text (no rolling append). */
  const setUtteranceTranscript = useCallback(
    (text: string, opts?: { scheduleAnswer?: boolean }) => {
      const piece = String(text || '').trim()
      if (!piece || isLikelySttGarbage(piece)) return
      transcriptRef.current = piece
      setTranscript(piece)
      setInterimTranscript('')
      setListeningStatus('')
      sttHealthyRef.current = true
      if (opts?.scheduleAnswer) scheduleAutoAnswer()
    },
    [scheduleAutoAnswer],
  )

  const generateFromText = useCallback(
    async (question: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript' }) => {
      const q = String(question || '').trim()
      if (!q || generatingRef.current) return
      const currentSettings = settingsRef.current
      const currentProfile = profileRef.current
      if (!getActiveApiKey(currentSettings)) {
        setError('Add your API key in Settings → AI Providers.')
        return
      }
      clearAutoAnswerTimer()
      generatingRef.current = true
      setIsGenerating(true)
      setError(null)
      try {
        const text = await requestInterviewAnswer({
          question: q,
          profile: currentProfile,
          settings: currentSettings,
          think:
            opts?.manual && opts?.source === 'manual_input' ? thinkMode : false,
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
    [thinkMode, scrollAnswer, clearAutoAnswerTimer],
  )
  generateFromTextRef.current = generateFromText

  const drainTranscribeQueue = useCallback(async () => {
    if (transcribeBusyRef.current) return
    transcribeBusyRef.current = true
    while (transcribeQueueRef.current.length > 0) {
      const blob = transcribeQueueRef.current.shift()
      if (!blob) continue
      setListeningStatus('Transcribing…')
      try {
        const text = await transcribeAudioBlob(settingsRef.current, blob)
        if (!text || isLikelySttGarbage(text)) {
          console.warn('[stt] skipped junk/empty transcript')
          continue
        }
        setUtteranceTranscript(text, { scheduleAnswer: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Cloud transcription failed'
        console.warn('[stt]', msg)
        setError(msg)
      }
    }
    transcribeBusyRef.current = false
    setListeningStatus('Listening…')
  }, [setUtteranceTranscript])

  const enqueueAudioChunk = useCallback(
    (blob: Blob) => {
      if (!blob || blob.size < MIN_AUDIO_BYTES) return
      transcribeQueueRef.current.push(blob)
      void drainTranscribeQueue()
    },
    [drainTranscribeQueue],
  )

  const stopCloudCapture = useCallback(() => {
    transcribeQueueRef.current = []
    deepgramLiveRef.current?.stop()
    deepgramLiveRef.current = null
    pcmStreamRef.current?.stop()
    pcmStreamRef.current = null
    utteranceVadRef.current?.stop()
    utteranceVadRef.current = null
    const stream = mediaStreamRef.current
    mediaStreamRef.current = null
    if (stream) stream.getTracks().forEach((t) => t.stop())
  }, [])

  const stopRecognition = useCallback(() => {
    clearAutoAnswerTimer()
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
    setListeningStatus('')
    setInterimTranscript('')
  }, [stopCloudCapture, clearAutoAnswerTimer])

  const startCloudCapture = useCallback(async () => {
    stopCloudCapture()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: settingsRef.current.micSensitivity === 'boost',
        },
      })
      mediaStreamRef.current = stream
      const provider = settingsRef.current.sttProvider
      setListeningStatus('Listening…')

      if (provider === 'deepgram') {
        const live = await connectDeepgramLive(settingsRef.current, {
          onInterim: (text) => {
            setInterimTranscript(text)
          },
          onUtterance: (text) => {
            if (!text || isLikelySttGarbage(text)) return
            setUtteranceTranscript(text, { scheduleAnswer: true })
          },
          onError: (msg) => setError(msg),
        })
        deepgramLiveRef.current = live
        pcmStreamRef.current = startPcmStreamCapture(stream, (samples, rate) => {
          live.sendPcm(samples, rate)
        })
        return
      }

      utteranceVadRef.current = startUtteranceVadCapture(stream, (wav) => {
        enqueueAudioChunk(wav)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone permission denied')
    }
  }, [enqueueAudioChunk, stopCloudCapture, setUtteranceTranscript])

  const startDeviceRecognition = useCallback(() => {
    if (!speechRecognitionAvailable()) {
      setError('On-device speech recognition unavailable. Try Cloud API in Settings → Audio.')
      return
    }

    try {
      const lang = speechLangFromSettings(settingsRef.current.micListenLanguage)
      const recognition = createSpeechRecognition(lang)
      recognitionRef.current = recognition
      lastDeviceFinalRef.current = ''

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let finalChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || ''
          if (event.results[i].isFinal) finalChunk += piece
          else interim += piece
        }

        if (interim.trim()) {
          setInterimTranscript(interim.trim())
        } else if (!finalChunk.trim()) {
          setInterimTranscript('')
        }

        if (finalChunk.trim()) {
          const merged = mergeCumulativeFinal(transcriptRef.current, finalChunk.trim())
          lastDeviceFinalRef.current = finalChunk.trim()
          transcriptRef.current = merged
          setTranscript(merged)
          setInterimTranscript('')
          sttHealthyRef.current = true
          scheduleAutoAnswer()
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
      setListeningStatus('Listening…')
      sttHealthyRef.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech recognition failed to start')
    }
  }, [scheduleAutoAnswer, sessionActive])

  const startRecognition = useCallback(() => {
    stopRecognition()
    if (!settingsRef.current.audioEnabled) return

    if (settingsRef.current.sttMode === 'cloud') {
      void startCloudCapture()
      return
    }
    startDeviceRecognition()
  }, [stopRecognition, startCloudCapture, startDeviceRecognition])

  const startSession = useCallback(() => {
    const freshProfile = loadProfile()
    profileRef.current = freshProfile

    if (!profileIsReady(freshProfile)) {
      setError('Add your resume in Settings → Personal Info first.')
      return
    }
    if (!getActiveApiKey(settings)) {
      setError('Add your API key in Settings → AI Providers.')
      return
    }
    if (settings.sttMode === 'cloud' && !sttKeyConfigured(settings, settings.sttProvider)) {
      setError(`Add your ${settings.sttProvider} API key in Settings → Audio.`)
      return
    }
    if (settings.sttMode === 'device' && !speechRecognitionAvailable()) {
      setError('On-device speech recognition is not available on this phone. Switch to Cloud API in Settings → Audio.')
      return
    }

    const profilePreview = profileToContextText(freshProfile).slice(0, 80)
    setError(null)
    setSessionActive(true)
    setStarting(true)
    setStartingMessage(
      profilePreview
        ? `Loading profile… ${profilePreview}${profilePreview.length >= 80 ? '…' : ''}`
        : 'Preparing session…',
    )
    setTranscript('')
    transcriptRef.current = ''
    setInterimTranscript('')
    setAnswer('')
    lastDeviceFinalRef.current = ''
    sttHealthyRef.current = false
    sessionStartedAtRef.current = Date.now()
    setPhase('interview')

    window.setTimeout(() => {
      startRecognition()
      setStartingMessage('Listening for questions…')
    }, 400)

    window.setTimeout(() => setStarting(false), SESSION_WARMUP_MS)
  }, [settings, startRecognition])

  const stopSession = useCallback(() => {
    setSessionActive(false)
    stopRecognition()
    setInterimTranscript('')
    setStarting(false)
    setListeningStatus('')
    setPhase('home')
  }, [stopRecognition])

  const assistNow = useCallback(() => {
    const q = transcriptRef.current.trim() || `${transcript} ${interimTranscript}`.trim()
    if (!q || isLikelySttGarbage(q)) {
      setError('No speech detected yet. Speak a question, then tap Assist.')
      return
    }
    void generateFromText(q, { source: 'transcript' })
  }, [transcript, interimTranscript, generateFromText])

  const newQuestion = useCallback(() => {
    clearAutoAnswerTimer()
    setTranscript('')
    transcriptRef.current = ''
    setInterimTranscript('')
    setAnswer('')
    lastDeviceFinalRef.current = ''
    setError(null)
    sttHealthyRef.current = settingsRef.current.sttMode === 'device'
    sessionStartedAtRef.current = Date.now()
    if (sessionActive && settingsRef.current.audioEnabled) startRecognition()
  }, [sessionActive, startRecognition, clearAutoAnswerTimer])

  const sendTypedQuestion = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q) return
      setTranscript(q)
      transcriptRef.current = q
      setInterimTranscript('')
      void generateFromText(q, { manual: true, source: 'manual_input' })
    },
    [generateFromText],
  )

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    return () => {
      clearAutoAnswerTimer()
      stopRecognition()
    }
  }, [stopRecognition, clearAutoAnswerTimer])

  const displayTranscript = (() => {
    const committed = transcript.trim()
    const interim = interimTranscript.trim()
    if (!interim) return committed
    if (!committed) return interim
    if (interim.startsWith(committed) || committed.startsWith(interim)) {
      return interim.length >= committed.length ? interim : committed
    }
    return `${committed} ${interim}`.trim()
  })()

  return {
    phase,
    transcript: displayTranscript,
    answer,
    thinkMode,
    setThinkMode,
    error,
    sessionActive,
    starting,
    startingMessage,
    listeningStatus,
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
