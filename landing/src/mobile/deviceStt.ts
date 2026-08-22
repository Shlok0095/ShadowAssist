import type { AppSettings } from './profileTypes'
import { speechLangFromSettings } from './providerRegistry'

export function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

const INTERVIEW_PHRASE_HINTS = [
  'explain',
  'describe',
  'tell me about',
  'transformer',
  'architecture',
  'machine learning',
  'deep learning',
  'XGBoost',
  'algorithm',
  'experience',
  'interview question',
  'how does',
  'what is',
  'can you',
  'please provide',
]

/**
 * Android Chrome: `continuous: true` often stops mid-utterance (Chromium #41297427).
 * Fast restart with continuous=false is more reliable on WebView.
 */
export function configureDeviceSpeechRecognition(
  recognition: SpeechRecognition,
  settings: AppSettings,
): void {
  recognition.interimResults = true
  recognition.maxAlternatives = 3
  recognition.lang = speechLangFromSettings(settings.micListenLanguage)
  recognition.continuous = !isAndroidWebView()
  applyDeviceSpeechPhrases(recognition)
}

/** Contextual biasing — boosts interview/tech terms (Chrome on-device when supported). */
export function applyDeviceSpeechPhrases(recognition: SpeechRecognition): void {
  try {
    const win = window as Window & {
      SpeechRecognitionPhrase?: new (phrase: string, boost?: number) => unknown
    }
    const PhraseCtor = win.SpeechRecognitionPhrase
    if (!PhraseCtor || !('phrases' in recognition)) return
    const boosted = INTERVIEW_PHRASE_HINTS.map((phrase) => new PhraseCtor(phrase, 2.8))
    ;(recognition as SpeechRecognition & { phrases?: unknown[] }).phrases = boosted
  } catch {
    /* optional API */
  }
}

/** Warm Android audio HAL before Web Speech binds — reduces slow first partials. */
export async function warmupDeviceMicrophone(settings: AppSettings): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return
  const boost = settings.micSensitivity === 'boost'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: !boost,
        autoGainControl: !boost,
      },
    })
    await new Promise((r) => setTimeout(r, 280))
    stream.getTracks().forEach((t) => t.stop())
  } catch {
    /* Web Speech may still work with its own mic path */
  }
}

/** Android: fast restart but not so fast that duplicate finals loop. */
export function deviceRecognitionRestartDelayMs(lastSpeechAt: number): number {
  if (!isAndroidWebView()) return 0
  const sinceSpeech = Date.now() - lastSpeechAt
  if (sinceSpeech < 4000) return 120
  return 280
}
