export type SessionPhase = 'setup' | 'ready' | 'listening' | 'generating' | 'error'

export type InterviewSettings = {
  showTranscription: boolean
  autoScroll: boolean
  autoAnswer: boolean
}

export const DEFAULT_SETTINGS: InterviewSettings = {
  showTranscription: true,
  autoScroll: true,
  autoAnswer: true,
}

const STORAGE_RESUME = 'veilassist.mobile.resume'
const STORAGE_JD = 'veilassist.mobile.jd'
const STORAGE_SETTINGS = 'veilassist.mobile.settings'

export function loadResume(): string {
  try {
    return localStorage.getItem(STORAGE_RESUME) || ''
  } catch {
    return ''
  }
}

export function saveResume(text: string) {
  try {
    localStorage.setItem(STORAGE_RESUME, text)
  } catch {
    /* ignore */
  }
}

export function loadJobDescription(): string {
  try {
    return localStorage.getItem(STORAGE_JD) || ''
  } catch {
    return ''
  }
}

export function saveJobDescription(text: string) {
  try {
    localStorage.setItem(STORAGE_JD, text)
  } catch {
    /* ignore */
  }
}

export function loadSettings(): InterviewSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      showTranscription: parsed.showTranscription !== false,
      autoScroll: parsed.autoScroll !== false,
      autoAnswer: parsed.autoAnswer !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: InterviewSettings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

export async function requestInterviewAnswer(params: {
  question: string
  resume: string
  jobDescription: string
  think: boolean
}): Promise<string> {
  const res = await fetch('/api/interview/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: params.question,
      resume: params.resume,
      jobDescription: params.jobDescription,
      think: params.think,
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
  return !!(window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)
}

export function createSpeechRecognition(): SpeechRecognition {
  const Ctor =
    window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition
  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1
  return recognition
}
