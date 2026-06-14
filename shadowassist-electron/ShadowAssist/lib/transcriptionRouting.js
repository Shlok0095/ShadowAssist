// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Mic transcription routing (cloud only).
 * Chat LLM uses store `provider`; cloud STT uses `sttProvider` (independent).
 */

const NATIVE_STT_PROVIDER_IDS = ['groq', 'openai', 'together', 'mistral', 'fireworks', 'nvidia']

const OPENAI_STYLE_STT = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    keyField: 'groqKey',
    modelFromStore: 'groqWhisperModel',
    defaultModel: 'whisper-large-v3-turbo',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    keyField: 'apiKey',
    fixedModel: 'whisper-1',
  },
  together: {
    baseURL: 'https://api.together.xyz/v1',
    keyField: 'togetherKey',
    modelFromStore: 'togetherWhisperModel',
    defaultModel: 'openai/whisper-large-v3',
  },
  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    keyField: 'mistralKey',
    modelFromStore: 'mistralSttModel',
    defaultModel: 'voxtral-mini-latest',
  },
}

const { DEFAULT_FUNCTION_ID: NVIDIA_PARAKEET_FUNCTION_ID } = require('./nvidiaRivaStt')

const STT_MODEL_FIELDS = {
  groq: 'groqWhisperModel',
  together: 'togetherWhisperModel',
  mistral: 'mistralSttModel',
  fireworks: 'fireworksSttModel',
  nvidia: 'nvidiaSttModel',
}

function nvidiaLanguageCode(get) {
  const raw = get('micListenLanguage')
  if (raw === 'en') return 'en-US'
  if (raw === 'hi') return 'hi-IN'
  return 'multi'
}

function nvidiaStt(get) {
  const key = get('nvidiaKey')
  if (!key) return null
  const model = get('nvidiaSttModel') || 'parakeet-1.1b-rnnt-multilingual-asr'
  return {
    sttKind: 'nvidia_riva',
    model,
    apiKey: key,
    functionId: NVIDIA_PARAKEET_FUNCTION_ID,
    responseKind: 'text',
    useWhisperSegmentMeta: false,
    languageCode: nvidiaLanguageCode(get),
  }
}

function fireworksStt(get) {
  const key = get('fireworksKey')
  if (!key) return null
  const m = (get('fireworksSttModel') || 'whisper-v3-turbo').toLowerCase()
  const turbo = m.includes('turbo')
  return {
    url: turbo
      ? 'https://audio-turbo.api.fireworks.ai/v1/audio/transcriptions'
      : 'https://audio-prod.api.fireworks.ai/v1/audio/transcriptions',
    model: turbo ? 'whisper-v3-turbo' : 'whisper-v3',
    apiKey: key,
    responseKind: 'text',
    useWhisperSegmentMeta: false,
  }
}

/** Legacy: dedicated fallback key when chat vendor had no STT */
function legacyFallbackTranscription(get) {
  const fbKey = get('audioFallbackKey')
  if (!fbKey) return null
  const fbProv = get('audioFallbackProvider') || 'openai'
  if (fbProv === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: get('groqWhisperModel') || 'whisper-large-v3-turbo',
      apiKey: fbKey,
      responseKind: 'text',
      useWhisperSegmentMeta: true,
    }
  }
  return {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
    apiKey: fbKey,
    responseKind: 'text',
    useWhisperSegmentMeta: true,
  }
}

const MIC_LISTEN_LANG_MODES = new Set(['en', 'hi', 'en_hi_hinglish'])

const WHISPER_PRIMERS = {
  en: 'Sure, let me explain. So in the meeting we discussed the updates and next steps.',
  hi: 'हाँ, मीटिंग में हमने सब कुछ discuss किया। ठीक है, आगे बढ़ते हैं।',
  en_hi_hinglish:
    'haan yaar, toh meeting mein kya hua? Let me know the updates. Okay sure.',
}

const ALLOWED_WHISPER_LANGUAGES = {
  en: ['english'],
  hi: ['hindi'],
  en_hi_hinglish: ['english', 'hindi'],
}

function micListenLanguageFormFields(get, _sttVendor) {
  const raw = get('micListenLanguage')
  const mode = MIC_LISTEN_LANG_MODES.has(raw) ? raw : 'en_hi_hinglish'

  const primer = WHISPER_PRIMERS[mode]
  const allowedLanguages = ALLOWED_WHISPER_LANGUAGES[mode]

  if (mode === 'en') return { language: 'en', prompt: primer, allowedLanguages }
  if (mode === 'hi') return { language: 'hi', prompt: primer, allowedLanguages }

  return { prompt: primer, allowedLanguages }
}

/**
 * @param {(key: string) => any} get
 * @returns {string}
 */
function getEffectiveSttProvider(get) {
  const explicit = get('sttProvider')
  if (explicit && NATIVE_STT_PROVIDER_IDS.includes(explicit)) return explicit
  const chat = get('provider') || 'groq'
  if (NATIVE_STT_PROVIDER_IDS.includes(chat)) return chat
  if (get('audioFallbackKey')) {
    const fb = get('audioFallbackProvider') || 'openai'
    return fb === 'groq' ? 'groq' : 'openai'
  }
  return 'groq'
}

/**
 * @param {string} sttProvider
 * @param {(key: string) => any} get
 * @returns {{ cfg: object | null, sttVendor: string | null }}
 */
function resolveSttConfigForProvider(sttProvider, get) {
  if (sttProvider === 'fireworks') {
    const cfg = fireworksStt(get)
    if (cfg) return { cfg, sttVendor: 'fireworks' }
    const leg = legacyFallbackTranscription(get)
    if (leg) return { cfg: leg, sttVendor: get('audioFallbackProvider') === 'groq' ? 'groq' : 'openai' }
    return { cfg: null, sttVendor: null }
  }

  if (sttProvider === 'nvidia') {
    const cfg = nvidiaStt(get)
    if (cfg) return { cfg, sttVendor: 'nvidia' }
    const leg = legacyFallbackTranscription(get)
    if (leg) return { cfg: leg, sttVendor: get('audioFallbackProvider') === 'groq' ? 'groq' : 'openai' }
    return { cfg: null, sttVendor: null }
  }

  const native = OPENAI_STYLE_STT[sttProvider]
  if (native) {
    const apiKey = get(native.keyField)
    if (apiKey) {
      const model = native.fixedModel || (get(native.modelFromStore) || native.defaultModel)
      const base = native.baseURL.replace(/\/$/, '')
      return {
        cfg: {
          url: `${base}/audio/transcriptions`,
          model,
          apiKey,
          responseKind: sttProvider === 'mistral' ? 'json' : 'text',
          useWhisperSegmentMeta: sttProvider !== 'mistral',
        },
        sttVendor: sttProvider,
      }
    }
  }

  const leg = legacyFallbackTranscription(get)
  if (leg) {
    return {
      cfg: leg,
      sttVendor: get('audioFallbackProvider') === 'groq' ? 'groq' : 'openai',
    }
  }
  return { cfg: null, sttVendor: null }
}

/**
 * @param {(key: string) => any} get
 * @returns {{ cfg: object | null, sttVendor: string | null }}
 */
function resolveSttConfigAndVendor(get) {
  const sttProvider = getEffectiveSttProvider(get)
  return resolveSttConfigForProvider(sttProvider, get)
}

function getTranscriptionRequestConfig(get) {
  const { cfg, sttVendor } = resolveSttConfigAndVendor(get)
  if (!cfg || !sttVendor) return cfg
  const lang = micListenLanguageFormFields(get, sttVendor)
  return { ...cfg, ...lang }
}

function needsSttKey(sttProvider) {
  return NATIVE_STT_PROVIDER_IDS.includes(sttProvider)
}

module.exports = {
  getTranscriptionRequestConfig,
  getEffectiveSttProvider,
  resolveSttConfigForProvider,
  NATIVE_STT_PROVIDER_IDS,
  STT_MODEL_FIELDS,
  needsSttKey,
  OPENAI_STYLE_STT,
}
