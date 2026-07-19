// Copyright (c) 2026 VeilAssist. All rights reserved.

/** CPU q8 — English primary (fast streaming). */
const MOONSHINE_TINY = 'onnx-community/moonshine-tiny-ONNX'
const MOONSHINE_BASE = 'onnx-community/moonshine-base-ONNX'

/** ~74 MB — local gate for Moonshine finals + primary for hi / Hinglish. */
const WHISPER_TINY = 'Xenova/whisper-tiny'

const SAMPLE_RATE = 16000

/**
 * Primary local STT model per listen language (+ optional user preference).
 * @param {string} micListenLanguage - en | hi | en_hi_hinglish
 * @param {string} [preference] - auto | moonshine-base | moonshine-tiny
 */
function resolveLocalModel(micListenLanguage, preference = 'auto') {
  const pref = String(preference || 'auto').toLowerCase()
  if (pref === 'moonshine-tiny') {
    return {
      modelId: MOONSHINE_TINY,
      language: 'en',
      family: 'moonshine',
      sampleRate: SAMPLE_RATE,
    }
  }
  if (pref === 'moonshine-base') {
    return {
      modelId: MOONSHINE_BASE,
      language: 'en',
      family: 'moonshine',
      sampleRate: SAMPLE_RATE,
    }
  }

  const lang = micListenLanguage === 'hi' || micListenLanguage === 'en_hi_hinglish' ? micListenLanguage : 'en'
  if (lang === 'en') {
    return {
      modelId: MOONSHINE_BASE,
      language: 'en',
      family: 'moonshine',
      sampleRate: SAMPLE_RATE,
    }
  }
  return {
    modelId: WHISPER_TINY,
    language: lang,
    family: 'whisper',
    sampleRate: SAMPLE_RATE,
  }
}

/**
 * Whisper Tiny gate spec — English Moonshine only (offline replacement for Groq gate).
 * @param {string} micListenLanguage
 * @returns {{ modelId: string, language: string, family: string } | null}
 */
function resolveGateModel(micListenLanguage) {
  const lang = micListenLanguage === 'hi' || micListenLanguage === 'en_hi_hinglish' ? micListenLanguage : 'en'
  if (lang !== 'en') return null
  return {
    modelId: WHISPER_TINY,
    language: 'en',
    family: 'whisper',
  }
}

module.exports = {
  MOONSHINE_BASE,
  MOONSHINE_TINY,
  WHISPER_TINY,
  SAMPLE_RATE,
  resolveLocalModel,
  resolveGateModel,
}
