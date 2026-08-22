import type { AppSettings } from './profileTypes'

export const GROQ_WHISPER_MODELS = ['whisper-large-v3-turbo', 'whisper-large-v3']
export const NVIDIA_PARAKEET_MODELS = [
  'nvidia/parakeet-1.1b-rnnt-multilingual-asr',
  'nvidia/parakeet-0.6b-ctc-en-us',
]

export const NVIDIA_NIM_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

export type SttProviderId = AppSettings['sttProvider']

export const STT_PROVIDER_META: Array<{
  id: SttProviderId
  label: string
  badge: string
  desc: string
  keyField: keyof AppSettings
  docs?: string
}> = [
  {
    id: 'nvidia',
    label: 'NVIDIA Parakeet',
    badge: 'FAST',
    desc: 'Parakeet RNNT — direct gRPC streaming on Android (same as Windows overlay).',
    keyField: 'nvidiaKey',
    docs: 'https://build.nvidia.com/',
  },
  {
    id: 'groq',
    label: 'Groq Whisper',
    badge: 'WHISPER',
    desc: 'Whisper large models on Groq — batch transcription with VAD.',
    keyField: 'groqKey',
    docs: 'https://console.groq.com/keys',
  },
]

const WHISPER_PRIMERS: Record<string, string> = {
  hi: 'ठीक है, तो इस सवाल का जवाब देते हैं।',
  en_hi_hinglish: 'English and Hindi mixed interview speech.',
}

export function nvidiaLanguageCode(lang: AppSettings['micListenLanguage']): string {
  if (lang === 'en' || lang === 'en_hi_hinglish') return 'multi'
  if (lang === 'hi') return 'hi-IN'
  return 'multi'
}

export function whisperLangParams(lang: AppSettings['micListenLanguage']): {
  language?: string
  prompt?: string
} {
  if (lang === 'en') return { language: 'en' }
  if (lang === 'hi') return { language: 'hi', prompt: WHISPER_PRIMERS.hi }
  return { language: 'en', prompt: WHISPER_PRIMERS.en_hi_hinglish }
}

export function getSttApiKey(settings: AppSettings, provider?: SttProviderId): string {
  const p = provider || settings.sttProvider
  if (p === 'nvidia') return settings.nvidiaKey.trim()
  return settings.groqKey.trim()
}

export function getSttModel(settings: AppSettings): string {
  if (settings.sttProvider === 'nvidia') {
    return settings.nvidiaWhisperModel.trim() || NVIDIA_PARAKEET_MODELS[0]
  }
  return settings.groqWhisperModel.trim() || 'whisper-large-v3-turbo'
}

export function sttModelOptions(provider: SttProviderId): string[] {
  if (provider === 'nvidia') return NVIDIA_PARAKEET_MODELS
  return GROQ_WHISPER_MODELS
}

export function sttKeyConfigured(settings: AppSettings, provider: SttProviderId): boolean {
  return getSttApiKey(settings, provider).length > 0
}

/** Migrate legacy saved providers (Deepgram / OpenAI Whisper) to supported STT vendors. */
export function normalizeSttProvider(raw: unknown): SttProviderId {
  if (raw === 'groq') return 'groq'
  return 'nvidia'
}
