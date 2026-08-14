import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileToContextText } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'

export type SessionPhase = 'home' | 'interview' | 'error'

export type InterviewRuntimeSettings = Pick<
  AppSettings,
  'showTranscription' | 'autoScroll' | 'autoAnswer' | 'questionDetection'
>

export async function requestInterviewAnswer(params: {
  question: string
  profile: PersonalProfile
  settings: AppSettings
  think: boolean
  source?: 'manual_input' | 'transcript'
}): Promise<string> {
  const origin = String(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')
  const chatUrl =
    origin
      ? `${origin}/api/interview/chat`
      : import.meta.env.VITE_MOBILE_APK
        ? 'https://veilassist.vercel.app/api/interview/chat'
        : '/api/interview/chat'

  const apiKey = getActiveApiKey(params.settings)
  const model = getActiveModel(params.settings)
  const profileText = profileToContextText(params.profile)
  const jobDescription = params.profile.jobDescription || params.settings.interviewTopic

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: params.question,
      profileText,
      jobDescription,
      interviewTopic: params.settings.interviewTopic,
      customInstructions: params.settings.customInstructions,
      answerStructure: params.settings.answerStructure,
      responseFormat: params.settings.responseFormat,
      answerLength: params.settings.answerLength,
      provider: params.settings.provider,
      apiKey,
      model,
      think: params.think,
      source: params.source || 'manual_input',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.detail || `Request failed (${res.status})`)
  }
  return String(data.answer || '').trim()
}

export function speechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function createSpeechRecognition(): SpeechRecognition {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) throw new Error('Speech recognition is not supported on this device')
  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1
  return recognition
}
