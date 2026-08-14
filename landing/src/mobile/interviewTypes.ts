import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileToContextText } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'
import { requestInterviewAnswerDirect } from './providerChat'

export type SessionPhase = 'home' | 'interview' | 'error'

export type InterviewRuntimeSettings = Pick<
  AppSettings,
  'showTranscription' | 'autoScroll' | 'autoAnswer' | 'questionDetection'
>

function isMobileApk(): boolean {
  return Boolean(import.meta.env.VITE_MOBILE_APK)
}

async function requestViaProxy(params: {
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

export async function requestInterviewAnswer(params: {
  question: string
  profile: PersonalProfile
  settings: AppSettings
  think: boolean
  source?: 'manual_input' | 'transcript'
}): Promise<string> {
  // APK: call NVIDIA/Groq/OpenAI directly (desktop-style BYOK — avoids CORS to Vercel).
  if (isMobileApk()) {
    return requestInterviewAnswerDirect(params)
  }

  try {
    return await requestViaProxy(params)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|network/i.test(msg) && getActiveApiKey(params.settings)) {
      return requestInterviewAnswerDirect(params)
    }
    throw e
  }
}

export function speechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function createSpeechRecognition(lang = 'en-US'): SpeechRecognition {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) throw new Error('Speech recognition is not supported on this device')
  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = lang
  recognition.maxAlternatives = 1
  return recognition
}
