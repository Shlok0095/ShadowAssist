// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Mic transcription routing.
 * Native = OpenAI-style POST …/v1/audio/transcriptions (multipart) OR Fireworks’ audio hosts (same API key).
 * Others need audioFallbackKey (Groq or OpenAI Whisper) unless you only type (no mic).
 */

/** Provider IDs that use YOUR vendor key for STT — no 3rd-party fallback key */
const NATIVE_STT_PROVIDER_IDS = ['groq', 'openai', 'together', 'mistral', 'fireworks']

/** Short explanations for settings UI (research-backed; no OpenAI-style /audio/transcriptions on same base) */
const STT_VENDOR_NOTES = {
  anthropic: 'Claude API has no Whisper-style /audio/transcriptions on the same key.',
  deepseek: 'DeepSeek public API is chat/reasoning only — no documented same-key STT endpoint.',
  moonshot: 'Kimi chat API has no OpenAI-compatible /audio/transcriptions; Kimi-Audio is separate.',
  nvidia: 'NIM chat models do not include a drop-in Whisper HTTP endpoint on the same key.',
  xai: 'xAI offers Voice Agent (WebSocket), not a simple multipart /audio/transcriptions for our mic chunks.',
  openrouter: 'OpenRouter uses chat completions + input_audio for some models — not our Whisper upload flow.',
  perplexity: 'Perplexity API is chat/search — no same-key Whisper endpoint.',
  google: 'Gemini transcribes via native Generate Content API, not the OpenAI-compat /audio/transcriptions path.',
  cerebras: 'Cerebras inference API is text — no bundled STT.',
  custom: 'Depends on your base URL; if GET /v1/models shows no audio models, use fallback for mic.',
}

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

function fallbackTranscription(get) {
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

/** Short Whisper `prompt` to bias English / Hindi / Roman Hinglish (under typical token limits). */
const MIC_LISTEN_MIXED_PROMPT =
  'English, Hindi (Devanagari or Roman), or mixed Hinglish. Transcribe in the scripts and wording the speaker uses.'

/**
 * @param {(key: string) => any} get
 * @param {string} sttVendor — provider id used for this request (groq, openai, together, mistral, fireworks, …)
 * @returns {{ language?: string, prompt?: string }}
 */
function micListenLanguageFormFields(get, sttVendor) {
  const raw = get('micListenLanguage')
  const mode = MIC_LISTEN_LANG_MODES.has(raw) ? raw : 'en_hi_hinglish'

  if (mode === 'en') return { language: 'en' }
  if (mode === 'hi') return { language: 'hi' }

  // Mixed: APIs have no multi-language whitelist; auto + optional prompt. Mistral Voxtral may ignore unknown fields.
  if (sttVendor === 'mistral') return {}
  return { prompt: MIC_LISTEN_MIXED_PROMPT }
}

function fallbackMicSttVendor(get) {
  return get('audioFallbackProvider') === 'groq' ? 'groq' : 'openai'
}

/**
 * @param {(key: string) => any} get
 * @returns {{ cfg: object | null, sttVendor: string | null }}
 */
function resolveSttConfigAndVendor(get) {
  const provider = get('provider') || 'groq'

  if (provider === 'fireworks') {
    const cfg = fireworksStt(get)
    if (cfg) return { cfg, sttVendor: 'fireworks' }
    return { cfg: fallbackTranscription(get), sttVendor: fallbackMicSttVendor(get) }
  }

  const native = OPENAI_STYLE_STT[provider]
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
          responseKind: provider === 'mistral' ? 'json' : 'text',
          useWhisperSegmentMeta: provider !== 'mistral',
        },
        sttVendor: provider,
      }
    }
  }
  return { cfg: fallbackTranscription(get), sttVendor: fallbackMicSttVendor(get) }
}

/**
 * @param {(key: string) => any} get
 * @returns {{ url: string, model: string, apiKey: string, responseKind: 'text'|'json', useWhisperSegmentMeta?: boolean, language?: string, prompt?: string } | null}
 */
function getTranscriptionRequestConfig(get) {
  const { cfg, sttVendor } = resolveSttConfigAndVendor(get)
  if (!cfg || !sttVendor) return cfg
  const lang = micListenLanguageFormFields(get, sttVendor)
  return { ...cfg, ...lang }
}

function needsThirdPartyMicKey(provider) {
  return !NATIVE_STT_PROVIDER_IDS.includes(provider)
}

module.exports = {
  getTranscriptionRequestConfig,
  NATIVE_STT_PROVIDER_IDS,
  STT_VENDOR_NOTES,
  needsThirdPartyMicKey,
  OPENAI_STYLE_STT,
}
