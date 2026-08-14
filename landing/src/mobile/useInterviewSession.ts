import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSpeechRecognition,
  loadJobDescription,
  loadResume,
  loadSettings,
  requestInterviewAnswer,
  saveSettings,
  speechRecognitionAvailable,
  type InterviewSettings,
  type SessionPhase,
} from './interviewTypes'

export function useInterviewSession() {
  const [phase, setPhase] = useState<SessionPhase>('setup')
  const [resume, setResume] = useState(() => loadResume())
  const [jobDescription, setJobDescription] = useState(() => loadJobDescription())
  const [settings, setSettings] = useState<InterviewSettings>(() => loadSettings())
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [thinkMode, setThinkMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const generatingRef = useRef(false)
  const lastFinalRef = useRef('')
  const transcriptRef = useRef('')
  const answerEndRef = useRef<HTMLDivElement | null>(null)

  const updateSettings = useCallback((patch: Partial<InterviewSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const scrollAnswer = useCallback(() => {
    if (!settings.autoScroll) return
    requestAnimationFrame(() => {
      answerEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [settings.autoScroll])

  const generateFromText = useCallback(
    async (question: string, opts?: { manual?: boolean }) => {
      const q = String(question || '').trim()
      if (!q || generatingRef.current) return
      generatingRef.current = true
      setPhase('generating')
      setError(null)
      try {
        const text = await requestInterviewAnswer({
          question: q,
          resume,
          jobDescription,
          think: thinkMode,
        })
        setAnswer(text)
        setPhase('listening')
        scrollAnswer()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Generation failed'
        setError(msg)
        setPhase(sessionActive ? 'listening' : 'ready')
        if (!opts?.manual) console.warn('[interview]', msg)
      } finally {
        generatingRef.current = false
      }
    },
    [resume, jobDescription, thinkMode, sessionActive, scrollAnswer],
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
      setError('Speech recognition is not supported in this browser. Use Chrome on Android.')
      setPhase('error')
      return
    }

    try {
      const recognition = createSpeechRecognition()
      recognitionRef.current = recognition

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
          if (settings.autoAnswer) {
            void generateFromText(finalChunk.trim())
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
      setPhase('listening')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech recognition failed to start')
      setPhase('error')
    }
  }, [stopRecognition, settings.autoAnswer, generateFromText, sessionActive])

  const startSession = useCallback(() => {
    if (!resume.trim()) {
      setError('Add your resume before starting.')
      setPhase('setup')
      return
    }
    setError(null)
    setSessionActive(true)
    setTranscript('')
    transcriptRef.current = ''
    setInterimTranscript('')
    setAnswer('')
    lastFinalRef.current = ''
    setPhase('ready')
    startRecognition()
  }, [resume, startRecognition])

  const stopSession = useCallback(() => {
    setSessionActive(false)
    stopRecognition()
    setInterimTranscript('')
    setPhase('setup')
  }, [stopRecognition])

  const assistNow = useCallback(() => {
    const q = `${transcript} ${interimTranscript}`.trim() || lastFinalRef.current
    if (!q) {
      setError('No speech detected yet. Speak a question, then tap Assist.')
      return
    }
    void generateFromText(q, { manual: true })
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
      void generateFromText(q, { manual: true })
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
    resume,
    setResume,
    jobDescription,
    setJobDescription,
    settings,
    updateSettings,
    transcript: displayTranscript,
    answer,
    thinkMode,
    setThinkMode,
    error,
    sessionActive,
    startSession,
    stopSession,
    assistNow,
    newQuestion,
    sendTypedQuestion,
    answerEndRef,
    isGenerating: phase === 'generating',
  }
}
