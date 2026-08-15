import { useCallback, useEffect, useRef, useState } from 'react'
import { minCharsForDetection } from './answerRouting'
import { transcribeAudioBlob } from './cloudStt'
import { connectDeepgramLive, type DeepgramLiveHandle } from './deepgramLiveStt'
import { startPcmStreamCapture } from './pcmStreamCapture'
import { isLikelySttGarbage, isUtteranceReadyForAutoAnswer } from './sttGarbage'
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
  validateProviderKey,
  type SessionPhase,
} from './interviewTypes'
import {
  loopPhaseLabel,
  MAX_TURN_HISTORY,
  type SessionLoopPhase,
  type SessionTurn,
} from './sessionLoopTypes'
import {
  clearSessionSnapshot,
  loadSessionSnapshot,
  persistSessionFields,
  saveSessionSnapshot,
} from './sessionPersistence'

const SESSION_WARMUP_MS = 1500
/** Silence after last speech activity before auto-answer (interviewman-style end-of-utterance). */
const UTTERANCE_END_SILENCE_MS = 2600
const MIN_AUDIO_BYTES = 800
const MAX_STT_RESTART_ATTEMPTS = 5
const STT_RESTART_BASE_MS = 400

function effectiveMinChars(settings: AppSettings): number {
  const base = minCharsForDetection(settings.questionDetection)
  if (settings.micSensitivity === 'boost') return Math.max(8, Math.floor(base * 0.65))
  return base
}

function sttLoopAllowsCapture(phase: SessionLoopPhase): boolean {
  return phase === 'listening' || phase === 'idle'
}

function speechErrorMessage(code: string): string | null {
  switch (code) {
    case 'aborted':
    case 'no-speech':
      return null
    case 'not-allowed':
      return 'Mic access needed — enable microphone in Android settings'
    case 'audio-capture':
      return 'Mic capture failed — check microphone hardware'
    case 'network':
      return null // transient — recognition restarts automatically
    case 'service-not-allowed':
      return 'Speech recognition not allowed on this device'
    default:
      return `Microphone error: ${code}`
  }
}

export function useInterviewSession(profile: PersonalProfile, settings: AppSettings) {
  const [phase, setPhase] = useState<SessionPhase>('home')
  const [loopPhase, setLoopPhase] = useState<SessionLoopPhase>('idle')
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
  const [turnHistory, setTurnHistory] = useState<SessionTurn[]>([])
  const [answerFailed, setAnswerFailed] = useState(false)
  const [lastFailedQuestion, setLastFailedQuestion] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [sttErrorState, setSttErrorState] = useState<string | null>(null)
  const [transcriptEditing, setTranscriptEditing] = useState(false)

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
  const sttRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef(settings)
  const profileRef = useRef(profile)
  const sessionStartedAtRef = useRef(0)
  const sttHealthyRef = useRef(false)
  const sessionActiveRef = useRef(false)
  const loopPhaseRef = useRef<SessionLoopPhase>('idle')
  const recognitionActiveRef = useRef(false)
  const recognitionStartingRef = useRef(false)
  const restartAttemptsRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const turnHistoryRef = useRef<SessionTurn[]>([])
  const wakeLockActiveRef = useRef(false)
  const sessionNotificationIdRef = useRef(1)
  const lastSpeechActivityRef = useRef(0)
  const interimTranscriptRef = useRef('')

  settingsRef.current = settings
  profileRef.current = profile
  turnHistoryRef.current = turnHistory

  const statusLabel = loopPhaseLabel(loopPhase, {
    reconnecting,
    sttError: sttErrorState || undefined,
    answerFailed,
  })

  const setLoopPhaseSync = useCallback(
    (next: SessionLoopPhase) => {
      loopPhaseRef.current = next
      setLoopPhase(next)
      persistSessionFields({
        loopPhase: next,
        sessionActive: sessionActiveRef.current,
        transcript: transcriptRef.current,
        answer,
        turnHistory: turnHistoryRef.current,
      })
    },
    [answer],
  )

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

  const clearSttRestartTimer = useCallback(() => {
    if (sttRestartTimerRef.current) {
      clearTimeout(sttRestartTimerRef.current)
      sttRestartTimerRef.current = null
    }
  }, [])

  const persistLive = useCallback(
    (patch: { transcript?: string; answer?: string; turnHistory?: SessionTurn[] }) => {
      persistSessionFields({
        sessionActive: sessionActiveRef.current,
        loopPhase: loopPhaseRef.current,
        transcript: patch.transcript ?? transcriptRef.current,
        answer: patch.answer ?? answer,
        turnHistory: patch.turnHistory ?? turnHistoryRef.current,
      })
    },
    [answer],
  )

  const clearUtteranceState = useCallback(() => {
    transcriptRef.current = ''
    lastDeviceFinalRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setTranscriptEditing(false)
    persistLive({ transcript: '' })
  }, [persistLive])

  const abortInFlightAnswer = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const stopCloudCaptureOnly = useCallback(() => {
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
    setReconnecting(false)
  }, [])

  const detachDeviceRecognition = useCallback(() => {
    const rec = recognitionRef.current
    recognitionRef.current = null
    recognitionActiveRef.current = false
    recognitionStartingRef.current = false
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

  const pauseListening = useCallback(() => {
    clearAutoAnswerTimer()
    clearSttRestartTimer()
    detachDeviceRecognition()
    stopCloudCaptureOnly()
    setListeningStatus('')
    setInterimTranscript('')
  }, [clearAutoAnswerTimer, clearSttRestartTimer, detachDeviceRecognition, stopCloudCaptureOnly])

  const generateFromTextRef = useRef<
    (q: string, opts?: { manual?: boolean; source?: 'manual_input' | 'transcript'; retry?: boolean }) => Promise<void>
  >()

  const tryAutoAnswer = useCallback(() => {
    if (loopPhaseRef.current === 'generating_answer' || loopPhaseRef.current === 'paused') return
    const merged = transcriptRef.current.trim()
    const s = settingsRef.current
    const warmedUp = Date.now() - sessionStartedAtRef.current >= SESSION_WARMUP_MS
    if (
      !warmedUp ||
      !sttHealthyRef.current ||
      !s.autoAnswer ||
      generatingRef.current ||
      merged.length < effectiveMinChars(s) ||
      !isUtteranceReadyForAutoAnswer(merged)
    ) {
      return
    }
    void generateFromTextRef.current?.(merged, { source: 'transcript' })
  }, [])

  const scheduleAutoAnswer = useCallback(() => {
    if (loopPhaseRef.current === 'generating_answer' || loopPhaseRef.current === 'paused') return
    clearAutoAnswerTimer()
    const silenceMs = Date.now() - lastSpeechActivityRef.current
    const wait = Math.max(120, UTTERANCE_END_SILENCE_MS - silenceMs)
    autoAnswerTimerRef.current = setTimeout(() => {
      autoAnswerTimerRef.current = null
      if (loopPhaseRef.current === 'generating_answer' || loopPhaseRef.current === 'paused') return
      const silentFor = Date.now() - lastSpeechActivityRef.current
      if (silentFor < UTTERANCE_END_SILENCE_MS - 80 || interimTranscriptRef.current.trim()) {
        scheduleAutoAnswer()
        return
      }
      tryAutoAnswer()
    }, wait)
  }, [clearAutoAnswerTimer, tryAutoAnswer])

  const markSpeechActivity = useCallback(() => {
    lastSpeechActivityRef.current = Date.now()
  }, [])

  const setUtteranceTranscript = useCallback(
    (text: string, opts?: { scheduleAnswer?: boolean }) => {
      if (loopPhaseRef.current === 'generating_answer' || loopPhaseRef.current === 'paused') return
      const piece = String(text || '').trim()
      if (!piece || isLikelySttGarbage(piece)) return
      transcriptRef.current = piece
      setTranscript(piece)
      setInterimTranscript('')
      setListeningStatus('Listening…')
      sttHealthyRef.current = true
      setSttErrorState(null)
      markSpeechActivity()
      persistLive({ transcript: piece })
      if (opts?.scheduleAnswer) scheduleAutoAnswer()
    },
    [scheduleAutoAnswer, persistLive, markSpeechActivity],
  )

  const finishAnswerCycle = useCallback(
    (opts?: { resumeListening?: boolean }) => {
      setAnswerFailed(false)
      setLastFailedQuestion('')
      if (!sessionActiveRef.current) {
        setLoopPhaseSync('idle')
        return
      }
      if (opts?.resumeListening && loopPhaseRef.current !== 'paused') {
        setLoopPhaseSync('listening')
      } else if (loopPhaseRef.current !== 'paused') {
        setLoopPhaseSync('listening')
      }
    },
    [setLoopPhaseSync],
  )

  const resumeListeningRef = useRef<() => void>(() => {})

  const generateFromText = useCallback(
    async (
      question: string,
      opts?: { manual?: boolean; source?: 'manual_input' | 'transcript'; retry?: boolean },
    ) => {
      const q = String(question || '').trim()
      if (!q) return
      if (generatingRef.current && !opts?.retry) return

      const currentSettings = settingsRef.current
      const currentProfile = profileRef.current
      if (!getActiveApiKey(currentSettings)) {
        setError('Add your API key in Settings → AI Providers.')
        return
      }

      abortInFlightAnswer()
      clearAutoAnswerTimer()
      pauseListening()
      generatingRef.current = true
      setIsGenerating(true)
      setAnswerFailed(false)
      setLoopPhaseSync('generating_answer')
      setError(null)
      setListeningStatus('Generating answer…')

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const text = await requestInterviewAnswer({
          question: q,
          profile: currentProfile,
          settings: currentSettings,
          think: opts?.manual && opts?.source === 'manual_input' ? thinkMode : false,
          source: opts?.source || 'manual_input',
          turnHistory: turnHistoryRef.current,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return

        setAnswer(text)
        persistLive({ answer: text })
        scrollAnswer()

        const nextHistory = [
          ...turnHistoryRef.current,
          { question: q, answer: text },
        ].slice(-MAX_TURN_HISTORY)
        turnHistoryRef.current = nextHistory
        setTurnHistory(nextHistory)
        persistLive({ turnHistory: nextHistory, answer: text })
      } catch (e) {
        if (controller.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'Generation failed'
        setError(msg)
        setAnswerFailed(true)
        setLastFailedQuestion(q)
        if (!opts?.manual) console.warn('[interview]', msg)
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
        generatingRef.current = false
        setIsGenerating(false)
        setStarting(false)
        finishAnswerCycle({ resumeListening: true })
        resumeListeningRef.current()
      }
    },
    [
      thinkMode,
      scrollAnswer,
      clearAutoAnswerTimer,
      pauseListening,
      abortInFlightAnswer,
      setLoopPhaseSync,
      finishAnswerCycle,
      persistLive,
    ],
  )
  generateFromTextRef.current = generateFromText

  const drainTranscribeQueue = useCallback(async () => {
    if (transcribeBusyRef.current) return
    if (!sttLoopAllowsCapture(loopPhaseRef.current)) return
    transcribeBusyRef.current = true
    while (transcribeQueueRef.current.length > 0) {
      if (!sttLoopAllowsCapture(loopPhaseRef.current)) break
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
        setSttErrorState('Transcription failed')
      }
    }
    transcribeBusyRef.current = false
    if (loopPhaseRef.current === 'listening') setListeningStatus('Listening…')
  }, [setUtteranceTranscript])

  const enqueueAudioChunk = useCallback(
    (blob: Blob) => {
      if (loopPhaseRef.current !== 'listening') return
      if (!blob || blob.size < MIN_AUDIO_BYTES) return
      transcribeQueueRef.current.push(blob)
      void drainTranscribeQueue()
    },
    [drainTranscribeQueue],
  )

  const scheduleRecognitionRestart = useCallback(
    (recognition: SpeechRecognition) => {
      if (!sessionActiveRef.current || recognitionRef.current !== recognition) return
      if (loopPhaseRef.current !== 'listening') return
      if (recognitionActiveRef.current || recognitionStartingRef.current) return

      if (restartAttemptsRef.current >= MAX_STT_RESTART_ATTEMPTS) {
        setSttErrorState('Speech recognition stopped — tap New Question to retry')
        setError('Speech recognition stopped after repeated errors.')
        return
      }

      const delay = STT_RESTART_BASE_MS * 2 ** restartAttemptsRef.current
      restartAttemptsRef.current += 1
      clearSttRestartTimer()
      sttRestartTimerRef.current = setTimeout(() => {
        sttRestartTimerRef.current = null
        if (!sessionActiveRef.current || recognitionRef.current !== recognition) return
        if (loopPhaseRef.current !== 'listening') return
        if (recognitionActiveRef.current || recognitionStartingRef.current) return
        try {
          recognitionStartingRef.current = true
          recognition.start()
          recognitionActiveRef.current = true
          recognitionStartingRef.current = false
          restartAttemptsRef.current = 0
          setSttErrorState(null)
        } catch {
          recognitionStartingRef.current = false
          scheduleRecognitionRestart(recognition)
        }
      }, delay)
    },
    [clearSttRestartTimer],
  )

  const startDeviceRecognition = useCallback(() => {
    if (!speechRecognitionAvailable()) {
      setError('On-device speech recognition unavailable. Try Cloud API in Settings → Audio.')
      setSttErrorState('On-device STT unavailable')
      return
    }

    detachDeviceRecognition()
    restartAttemptsRef.current = 0

    try {
      const lang = speechLangFromSettings(settingsRef.current.micListenLanguage)
      const recognition = createSpeechRecognition(lang)
      recognitionRef.current = recognition
      lastDeviceFinalRef.current = ''

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (loopPhaseRef.current !== 'listening') return
        restartAttemptsRef.current = 0
        let interim = ''
        let finalChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || ''
          if (event.results[i].isFinal) finalChunk += piece
          else interim += piece
        }

        if (interim.trim()) {
          const piece = interim.trim()
          interimTranscriptRef.current = piece
          markSpeechActivity()
          clearAutoAnswerTimer()
          setInterimTranscript(piece)
          setListeningStatus('Listening…')
        } else if (!finalChunk.trim()) {
          interimTranscriptRef.current = ''
          setInterimTranscript('')
        }

        if (finalChunk.trim()) {
          interimTranscriptRef.current = ''
          const merged = mergeCumulativeFinal(transcriptRef.current, finalChunk.trim())
          lastDeviceFinalRef.current = finalChunk.trim()
          transcriptRef.current = merged
          setTranscript(merged)
          setInterimTranscript('')
          sttHealthyRef.current = true
          setSttErrorState(null)
          markSpeechActivity()
          persistLive({ transcript: merged })
          scheduleAutoAnswer()
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'network') {
          setSttErrorState('Speech reconnecting…')
          return
        }
        const msg = speechErrorMessage(event.error)
        if (!msg) return
        setSttErrorState(msg)
        setError(msg)
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          recognitionActiveRef.current = false
        }
      }

      const recWithStart = recognition as SpeechRecognition & { onstart?: () => void }
      recWithStart.onstart = () => {
        recognitionActiveRef.current = true
        recognitionStartingRef.current = false
      }

      recognition.onend = () => {
        recognitionActiveRef.current = false
        recognitionStartingRef.current = false
        if (
          sessionActiveRef.current &&
          recognitionRef.current === recognition &&
          loopPhaseRef.current === 'listening'
        ) {
          scheduleRecognitionRestart(recognition)
        }
      }

      recognitionStartingRef.current = true
      recognition.start()
      setListeningStatus('Listening…')
      sttHealthyRef.current = true
    } catch (e) {
      recognitionStartingRef.current = false
      const msg = e instanceof Error ? e.message : 'Speech recognition failed to start'
      setError(msg)
      setSttErrorState(msg)
    }
  }, [
    detachDeviceRecognition,
    scheduleAutoAnswer,
    scheduleRecognitionRestart,
    persistLive,
    markSpeechActivity,
    clearAutoAnswerTimer,
  ])

  const startCloudCapture = useCallback(async () => {
    stopCloudCaptureOnly()
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
            if (loopPhaseRef.current !== 'listening') return
            interimTranscriptRef.current = text
            markSpeechActivity()
            clearAutoAnswerTimer()
            setInterimTranscript(text)
            setListeningStatus('Listening…')
          },
          onUtterance: (text) => {
            if (!text || isLikelySttGarbage(text)) return
            setUtteranceTranscript(text, { scheduleAnswer: true })
          },
          onError: (msg) => {
            setError(msg)
            setSttErrorState(msg)
          },
          onReconnecting: () => setReconnecting(true),
          onReconnected: () => {
            setReconnecting(false)
            setSttErrorState(null)
          },
        })
        deepgramLiveRef.current = live
        pcmStreamRef.current = startPcmStreamCapture(stream, (samples, rate) => {
          if (loopPhaseRef.current === 'listening') live.sendPcm(samples, rate)
        })
        return
      }

      utteranceVadRef.current = startUtteranceVadCapture(stream, (wav) => {
        enqueueAudioChunk(wav)
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone permission denied'
      setError(msg)
      setSttErrorState(msg)
    }
  }, [enqueueAudioChunk, stopCloudCaptureOnly, setUtteranceTranscript, markSpeechActivity, clearAutoAnswerTimer])

  const startRecognitionInternal = useCallback(() => {
    if (!sessionActiveRef.current) return
    if (loopPhaseRef.current !== 'listening') return
    if (!settingsRef.current.audioEnabled) return

    pauseListening()

    if (settingsRef.current.sttMode === 'cloud') {
      void startCloudCapture()
      return
    }
    startDeviceRecognition()
  }, [pauseListening, startCloudCapture, startDeviceRecognition])

  resumeListeningRef.current = () => {
    if (!sessionActiveRef.current || loopPhaseRef.current !== 'listening') return
    clearUtteranceState()
    interimTranscriptRef.current = ''
    lastSpeechActivityRef.current = Date.now()
    startRecognitionInternal()
  }

  const stopRecognition = useCallback(() => {
    clearAutoAnswerTimer()
    clearSttRestartTimer()
    pauseListening()
  }, [clearAutoAnswerTimer, clearSttRestartTimer, pauseListening])

  const releaseSessionResources = useCallback(async () => {
    try {
      const { KeepAwake } = await import('@capacitor-community/keep-awake')
      if (wakeLockActiveRef.current) {
        await KeepAwake.allowSleep()
        wakeLockActiveRef.current = false
      }
    } catch {
      /* plugin optional */
    }
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.cancel({ notifications: [{ id: sessionNotificationIdRef.current }] })
    } catch {
      /* ignore */
    }
  }, [])

  const activateSessionResources = useCallback(async () => {
    if (settingsRef.current.keepScreenAwake) {
      try {
        const { KeepAwake } = await import('@capacitor-community/keep-awake')
        await KeepAwake.keepAwake()
        wakeLockActiveRef.current = true
      } catch {
        /* ignore */
      }
    }
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.requestPermissions()
      await LocalNotifications.schedule({
        notifications: [
          {
            id: sessionNotificationIdRef.current,
            title: 'VeilAssist Interview',
            body: 'Interview session active — listening for questions',
            autoCancel: false,
          },
        ],
      })
    } catch {
      /* notifications optional */
    }
  }, [])

  const startSession = useCallback(async () => {
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
      setError(
        'On-device speech recognition is not available on this phone. Switch to Cloud API in Settings → Audio.',
      )
      return
    }

    setError(null)
    setStarting(true)
    setStartingMessage('Validating API key…')

    const validation = await validateProviderKey(settings)
    if (!validation.ok) {
      setStarting(false)
      setError(validation.error || 'API key validation failed. Check Settings → AI Providers.')
      return
    }

    const snapshot = loadSessionSnapshot()
    const restoredHistory = snapshot?.turnHistory?.length ? snapshot.turnHistory : []

    sessionActiveRef.current = true
    setSessionActive(true)
    setTurnHistory(restoredHistory)
    turnHistoryRef.current = restoredHistory
    setAnswerFailed(false)
    setLastFailedQuestion('')
    setReconnecting(false)
    setSttErrorState(null)

    const profilePreview = profileToContextText(freshProfile).slice(0, 80)
    setStartingMessage(
      profilePreview
        ? `Loading profile… ${profilePreview}${profilePreview.length >= 80 ? '…' : ''}`
        : 'Preparing session…',
    )

    clearUtteranceState()
    setAnswer(snapshot?.answer || '')
    setLoopPhaseSync('idle')
    sttHealthyRef.current = false
    sessionStartedAtRef.current = Date.now()
    setPhase('interview')

    saveSessionSnapshot({
      sessionActive: true,
      loopPhase: 'idle',
      transcript: '',
      answer: snapshot?.answer || '',
      turnHistory: restoredHistory,
      updatedAt: Date.now(),
    })

    void activateSessionResources()

    window.setTimeout(() => {
      setLoopPhaseSync('listening')
      startRecognitionInternal()
      setStartingMessage('Listening for questions…')
    }, 400)

    window.setTimeout(() => setStarting(false), SESSION_WARMUP_MS)
  }, [settings, clearUtteranceState, setLoopPhaseSync, startRecognitionInternal, activateSessionResources])

  const stopSession = useCallback(() => {
    sessionActiveRef.current = false
    setSessionActive(false)
    abortInFlightAnswer()
    stopRecognition()
    setInterimTranscript('')
    setStarting(false)
    setListeningStatus('')
    setReconnecting(false)
    setSttErrorState(null)
    setAnswerFailed(false)
    setLoopPhaseSync('idle')
    setPhase('home')
    clearSessionSnapshot()
    void releaseSessionResources()
  }, [stopRecognition, abortInFlightAnswer, setLoopPhaseSync, releaseSessionResources])

  const assistNow = useCallback(() => {
    const q = transcriptRef.current.trim() || `${transcript} ${interimTranscript}`.trim()
    if (!q || isLikelySttGarbage(q)) {
      setError('No speech detected yet. Speak a question, then tap Assist.')
      return
    }
    void generateFromText(q, { source: 'transcript' })
  }, [transcript, interimTranscript, generateFromText])

  const retryFailedAnswer = useCallback(() => {
    const q = lastFailedQuestion.trim()
    if (!q) return
    void generateFromText(q, { source: 'transcript', retry: true })
  }, [lastFailedQuestion, generateFromText])

  const newQuestion = useCallback(() => {
    clearAutoAnswerTimer()
    abortInFlightAnswer()
    clearUtteranceState()
    setAnswer('')
    persistLive({ answer: '' })
    setError(null)
    setAnswerFailed(false)
    setLastFailedQuestion('')
    setSttErrorState(null)
    sttHealthyRef.current = settingsRef.current.sttMode === 'device'
    sessionStartedAtRef.current = Date.now()
    if (sessionActiveRef.current && loopPhaseRef.current !== 'paused') {
      setLoopPhaseSync('listening')
      startRecognitionInternal()
    }
  }, [
    clearAutoAnswerTimer,
    abortInFlightAnswer,
    clearUtteranceState,
    persistLive,
    setLoopPhaseSync,
    startRecognitionInternal,
  ])

  const sendTypedQuestion = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q) return
      transcriptRef.current = q
      setTranscript(q)
      setInterimTranscript('')
      void generateFromText(q, { manual: true, source: 'manual_input' })
    },
    [generateFromText],
  )

  const setTranscriptManual = useCallback(
    (text: string) => {
      const piece = String(text || '').trim()
      transcriptRef.current = piece
      setTranscript(piece)
      setInterimTranscript('')
      setTranscriptEditing(false)
      persistLive({ transcript: piece })
      if (piece && settingsRef.current.autoAnswer) scheduleAutoAnswer()
    },
    [persistLive, scheduleAutoAnswer],
  )

  const clearError = useCallback(() => setError(null), [])

  const restoreSessionFromSnapshot = useCallback(() => {
    const snapshot = loadSessionSnapshot()
    if (!snapshot?.sessionActive) return false

    sessionActiveRef.current = true
    setSessionActive(true)
    setPhase('interview')
    setTurnHistory(snapshot.turnHistory || [])
    turnHistoryRef.current = snapshot.turnHistory || []
    transcriptRef.current = snapshot.transcript || ''
    setTranscript(snapshot.transcript || '')
    setAnswer(snapshot.answer || '')
    setLoopPhaseSync(snapshot.loopPhase === 'paused' ? 'paused' : 'listening')
    setStarting(false)
    setAnswerFailed(false)
    void activateSessionResources()

    if (snapshot.loopPhase !== 'paused') {
      window.setTimeout(() => {
        setLoopPhaseSync('listening')
        startRecognitionInternal()
      }, 300)
    }
    return true
  }, [setLoopPhaseSync, startRecognitionInternal, activateSessionResources])

  // App lifecycle: background / foreground
  useEffect(() => {
    let remove: (() => void) | undefined
    void import('@capacitor/app')
      .then(async ({ App }) => {
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (!sessionActiveRef.current) return
          if (!isActive) {
            pauseListening()
            setLoopPhaseSync('paused')
            setListeningStatus('Paused (app backgrounded)')
          } else if (loopPhaseRef.current === 'paused') {
            setLoopPhaseSync('listening')
            setListeningStatus('Resuming…')
            resumeListeningRef.current()
          }
        })
        remove = () => void handle.remove()
      })
      .catch(() => {
        /* web dev */
      })
    return () => remove?.()
  }, [pauseListening, setLoopPhaseSync])

  // Persist answer on change
  useEffect(() => {
    if (!sessionActive) return
    persistLive({ answer })
  }, [answer, sessionActive, persistLive])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    return () => {
      clearAutoAnswerTimer()
      clearSttRestartTimer()
      stopRecognition()
      void releaseSessionResources()
    }
  }, [stopRecognition, clearAutoAnswerTimer, clearSttRestartTimer, releaseSessionResources])

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
    loopPhase,
    statusLabel,
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
    answerFailed,
    retryFailedAnswer,
    transcriptEditing,
    setTranscriptEditing,
    setTranscriptManual,
    turnHistory,
    restoreSessionFromSnapshot,
  }
}
