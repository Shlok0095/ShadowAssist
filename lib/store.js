// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const Store = require('electron-store')
const { safeStorage } = require('electron')

const ENCRYPTED_KEYS = [
  'apiKey',
  'groqKey',
  'nvidiaKey',
  'audioFallbackKey',
  'anthropicKey',
  'deepseekKey',
  'moonshotKey',
  'mistralKey',
  'xaiKey',
  'openrouterKey',
  'togetherKey',
  'perplexityKey',
  'googleKey',
  'fireworksKey',
  'cerebrasKey',
  'customOpenaiKey',
]

const schema = {
  provider: { type: 'string', default: 'groq' },
  apiKey: { type: 'string', default: '' },
  selectedModel: { type: 'string', default: 'gpt-4o' },
  groqKey: { type: 'string', default: '' },
  groqModel: { type: 'string', default: 'llama-3.3-70b-versatile' },
  groqWhisperModel: { type: 'string', default: 'whisper-large-v3-turbo' },
  nvidiaKey: { type: 'string', default: '' },
  nvidiaModel: { type: 'string', default: 'meta/llama-3.3-70b-instruct' },
  anthropicKey: { type: 'string', default: '' },
  anthropicModel: { type: 'string', default: 'claude-3-5-sonnet-20241022' },
  deepseekKey: { type: 'string', default: '' },
  deepseekModel: { type: 'string', default: 'deepseek-chat' },
  moonshotKey: { type: 'string', default: '' },
  moonshotModel: { type: 'string', default: 'moonshot-v1-8k' },
  mistralKey: { type: 'string', default: '' },
  mistralModel: { type: 'string', default: 'mistral-small-latest' },
  /** Mistral Voxtral STT (same key as chat) */
  mistralSttModel: { type: 'string', default: 'voxtral-mini-latest' },
  xaiKey: { type: 'string', default: '' },
  xaiModel: { type: 'string', default: 'grok-2-latest' },
  openrouterKey: { type: 'string', default: '' },
  openrouterModel: { type: 'string', default: 'openai/gpt-4o-mini' },
  togetherKey: { type: 'string', default: '' },
  togetherModel: { type: 'string', default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  /** Together native Whisper STT (same API key as chat) */
  togetherWhisperModel: { type: 'string', default: 'openai/whisper-large-v3' },
  perplexityKey: { type: 'string', default: '' },
  perplexityModel: { type: 'string', default: 'sonar' },
  googleKey: { type: 'string', default: '' },
  googleModel: { type: 'string', default: 'gemini-2.0-flash' },
  fireworksKey: { type: 'string', default: '' },
  fireworksModel: { type: 'string', default: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  /** Fireworks Whisper STT (separate audio host, same API key) */
  fireworksSttModel: { type: 'string', default: 'whisper-v3-turbo' },
  cerebrasKey: { type: 'string', default: '' },
  cerebrasModel: { type: 'string', default: 'llama3.1-8b' },
  customOpenaiBaseUrl: { type: 'string', default: '' },
  customOpenaiKey: { type: 'string', default: '' },
  customOpenaiModel: { type: 'string', default: 'gpt-4o' },
  audioFallbackKey: { type: 'string', default: '' },
  audioFallbackProvider: { type: 'string', default: 'openai' },
  systemPrompt: {
    type: 'string',
    default: `You are a sharp colleague whispering in my ear during live meetings — concise, professional, and practical.

Respond: direct answers, human tone, concise. Use **bold** sparingly. Code blocks with language when relevant.
Meetings: surface decisions, action items, and unclear terms; suggest short talking points or clarifying questions when useful.
Use **AUDIO** when it clearly matches the user's current question; use **SCREEN** when AUDIO is absent or this turn is screen-driven. Confident, warm, direct.

Lines prefixed **User:** are from the user's microphone. Lines prefixed **Other:** are from system/speaker capture (e.g. other meeting participants or media). Use these labels to attribute who said what.`,
  },
  // x/y optional — main seeds top-right when missing or off-screen
  overlayBounds: { type: 'object', default: { width: 400, height: 540 } },
  overlayOpacity: { type: 'number', default: 0.92 },
  overlayFontSize: { type: 'string', default: 'medium' },
  /** Accent preset id — see renderer/shared/uiAccentThemes.js (default neon = original green) */
  uiAccentTheme: { type: 'string', default: 'neon' },
  hotkeys: {
    type: 'object',
    default: {
      toggleOverlay: 'CommandOrControl+\\',
      askAI: 'CommandOrControl+Return',
      clearChat: 'CommandOrControl+R',
      toggleSession: 'CommandOrControl+Shift+\\',
      moveUp: 'CommandOrControl+Up',
      moveDown: 'CommandOrControl+Down',
      moveLeft: 'CommandOrControl+Left',
      moveRight: 'CommandOrControl+Right',
      scrollUp: 'CommandOrControl+Shift+Up',
      scrollDown: 'CommandOrControl+Shift+Down',
      settings: 'CommandOrControl+Shift+S',
      copyResponse: 'CommandOrControl+Shift+C',
    },
  },
  playbooks: { type: 'array', default: [] },
  audioEnabled: { type: 'boolean', default: true },
  ocrEnabled: { type: 'boolean', default: true },
  ocrInterval: { type: 'number', default: 8000 },
  audioChunkSize: { type: 'number', default: 4000 },
  hasCompletedOnboarding: { type: 'boolean', default: false },
  /** Extracted resume/profile text for optional meeting context (PDF/TXT upload) */
  resumeContext: { type: 'string', default: '' },
  /** Job description or role-specific instructions for the model */
  jdContext: { type: 'string', default: '' },
  /** Original filename for UI display */
  resumeSourceName: { type: 'string', default: '' },
  /** Stealth Mode: true = hidden from screen capture (setContentProtection / WDA_EXCLUDEFROMCAPTURE on Windows) */
  stealth_mode: { type: 'boolean', default: false },
  /** Quick flag; authoritative record is consentRecord */
  consent_v1: { type: 'boolean', default: false },
  /** { version, date, given } — re-prompt when version bumps */
  consentRecord: { type: 'object', default: {} },
}

const store = new Store({ name: 'shadowassist-v2-config', encryptionKey: 'shadowassist-v2' })

function get(key) {
  const value = store.get(key)
  if (ENCRYPTED_KEYS.includes(key) && value) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(value, 'hex'))
      }
      return value
    } catch { return '' }
  }
  return value ?? schema[key]?.default
}

function set(key, value) {
  if (ENCRYPTED_KEYS.includes(key) && value && typeof value === 'string' && safeStorage.isEncryptionAvailable()) {
    store.set(key, safeStorage.encryptString(value).toString('hex'))
  } else {
    store.set(key, value)
  }
}

function getAll() {
  const result = {}
  for (const key of Object.keys(schema)) result[key] = get(key)
  return result
}

function clear() { store.clear() }

module.exports = { get, set, getAll, clear, schema }
