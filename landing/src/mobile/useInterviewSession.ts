import { useCallback, useEffect, useRef, useState } from 'react'
import { minCharsForDetection } from './answerRouting'
import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileIsReady } from './profileTypes'
import { getActiveApiKey } from './profileStorage'
import {
  createSpeechRecognition,
  requestInterviewAnswer,
  speechRecognitionAvailable,
  type SessionPhase,
} from './interviewTypes'

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
  const generatingRef = useRef(false)
  const lastFinalRef = useRef('')
  const transcriptRef = useRef('')
  const answerEndRef = useRef<HTMLDivElement | null>(null)

  const scrollAnswer = useCallback(() => {
    if (!settings.autoScroll) return
    requestAnimationFrame(() => {
      answerEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [settings.autoScroll])

  const generateFromText = useCallback(
    async (question: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript' }) => {
      const q = String(question || '').trim()
      if (!q || generatingRef.current) return
      if (!getActiveApiKey(settings)) {
        setError('Add your API key in Settings → AI Provider.')
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

  const stopRecognition = useCallback(() => {
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
  }, [])

  const startRecognition = useCallback(() => {
    stopRecognition()
    if (!speechRecognitionAvailable()) {
      setError('Speech recognition unavailable. Type questions in the bar below.')
      return
    }

    try {
      const recognition = createSpeechRecognition()
      recognitionRef.current = recognition
      const minChars = minCharsForDetection(settings.questionDetection)

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
          const merged = `${transcriptRef.current} ${finalChunk}`.trim()
          transcriptRef.current = merged
          setTranscript(merged)
          setInterimTranscript('')
          lastFinalRef.current = finalChunk.trim()
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
  }, [stopRecognition, settings.autoAnswer, settings.questionDetection, generateFromText, sessionActive])

  const startSession = useCallback(() => {
    if (!profileIsReady(profile)) {
      setError('Add your resume in Settings → Personal Info first.')
      return
    }
    if (!getActiveApiKey(settings)) {
      setError('Add your API key in Settings → AI Provider.')
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
    if (sessionActive && !recognitionRef.current) startRecognition()
  }, [sessionActive, startRecognition])

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
  }
}
