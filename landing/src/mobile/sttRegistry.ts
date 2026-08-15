import type { AppSettings } from './profileTypes'
import type { MicListenLanguage } from './providerRegistry'
import {
  DEEPGRAM_MODELS,
  GROQ_WHISPER_MODELS,
  NVIDIA_PARAKEET_MODELS,
} from './modelCatalog'

export type SttProviderId = AppSettings['sttProvider']

export const NVIDIA_NIM_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

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
    desc: 'Parakeet RNNT multilingual ASR — same NIM as desktop (low latency).',
    keyField: 'nvidiaKey',
    docs: 'https://build.nvidia.com/',
  },
  {
    id: 'deepgram',
    label: 'Deepgram',
    badge: 'NOVA',
    desc: 'Nova streaming-quality REST transcription.',
    keyField: 'deepgramKey',
    docs: 'https://console.deepgram.com/',
  },
  {
    id: 'groq',
    label: 'Groq Whisper',
    badge: 'WHISPER',
    desc: 'Whisper large models on Groq.',
    keyField: 'groqKey',
    docs: 'https://console.groq.com/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI Whisper',
    badge: 'WHISPER',
    desc: 'Whisper-1 batch transcription.',
    keyField: 'apiKey',
    docs: 'https://platform.openai.com/api-keys',
  },
]

const WHISPER_PRIMERS: Record<MicListenLanguage, string> = {
  en: 'Okay, so let me think about this. The question is asking about...',
  hi: 'ठीक है, तो इस सवाल का जवाब देते हैं।',
  en_hi_hinglish: 'Okay so yaar, is question ka answer kya hoga? Let me think...',
}

export function nvidiaLanguageCode(lang: MicListenLanguage): string {
  if (lang === 'en') return 'en-US'
  if (lang === 'hi') return 'hi-IN'
  return 'multi'
}

export function whisperLangParams(lang: MicListenLanguage): {
  language?: string
  prompt?: string
} {
  const primer = WHISPER_PRIMERS[lang] || WHISPER_PRIMERS.en
  if (lang === 'en') return { language: 'en', prompt: primer }
  if (lang === 'hi') return { language: 'hi', prompt: primer }
  return { prompt: primer }
}

export function getSttApiKey(settings: AppSettings, provider?: SttProviderId): string {
  const p = provider || settings.sttProvider
  if (p === 'nvidia') return settings.nvidiaKey.trim()
  if (p === 'deepgram') return settings.deepgramKey.trim()
  if (p === 'groq') return settings.groqKey.trim()
  return settings.apiKey.trim()
}

export function getSttModel(settings: AppSettings): string {
  if (settings.sttProvider === 'nvidia') {
    return settings.nvidiaWhisperModel.trim() || NVIDIA_PARAKEET_MODELS[0]
  }
  if (settings.sttProvider === 'deepgram') {
    return settings.deepgramModel.trim() || 'nova-2'
  }
  if (settings.sttProvider === 'groq') {
    return settings.groqWhisperModel.trim() || 'whisper-large-v3'
  }
  return 'whisper-1'
}

export function sttModelOptions(provider: SttProviderId): string[] {
  if (provider === 'nvidia') return NVIDIA_PARAKEET_MODELS
  if (provider === 'deepgram') return DEEPGRAM_MODELS
  if (provider === 'groq') return GROQ_WHISPER_MODELS
  return ['whisper-1']
}

export function sttKeyConfigured(settings: AppSettings, provider: SttProviderId): boolean {
  return getSttApiKey(settings, provider).length > 0
}
