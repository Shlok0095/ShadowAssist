// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const Store = require('electron-store')
const { safeStorage } = require('electron')

/** Bump when you need all users to re-enter API keys + consent + onboarding (e.g. compliance). */
const DATA_EPOCH = 3

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
  'googleCalendarClientSecret',
  'googleCalendarAccessToken',
  'googleCalendarRefreshToken',
]

const schema = {
  /** Chat / Ask AI provider */
  provider: { type: 'string', default: 'groq' },
  /** Cloud mic STT provider (independent of chat) */
  sttProvider: { type: 'string', default: 'groq' },
  apiKey: { type: 'string', default: '' },
  selectedModel: { type: 'string', default: 'gpt-4o' },
  groqKey: { type: 'string', default: '' },
  groqModel: { type: 'string', default: 'llama-3.3-70b-versatile' },
  groqWhisperModel: { type: 'string', default: 'whisper-large-v3-turbo' },
  nvidiaKey: { type: 'string', default: '' },
  nvidiaModel: { type: 'string', default: 'meta/llama-3.3-70b-instruct' },
  /** NVIDIA Parakeet STT (same nvapi key as chat; gRPC on grpc.nvcf.nvidia.com) */
  nvidiaSttModel: { type: 'string', default: 'parakeet-1.1b-rnnt-multilingual-asr' },
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
  /** Google Calendar OAuth (user-provided Google Cloud desktop app credentials). */
  googleCalendarClientId: { type: 'string', default: '' },
  googleCalendarClientSecret: { type: 'string', default: '' },
  googleCalendarAccessToken: { type: 'string', default: '' },
  googleCalendarRefreshToken: { type: 'string', default: '' },
  googleCalendarTokenExpiry: { type: 'number', default: 0 },
  googleCalendarConnectedEmail: { type: 'string', default: '' },
  /** Calendar reminder notifications (upcoming accepted meetings). */
  calendarRemindersEnabled: { type: 'boolean', default: true },
  /** Minutes before start to notify (0 = at start time). */
  calendarReminderMinutes: { type: 'number', default: 5 },
  /** Persisted listen session summaries shown in Settings > Meetings. */
  listenSessionSummaries: { type: 'array', default: [] },
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
  /** Empty = use built-in prompt from lib/defaultSystemPrompt.js (ShadowAssist base). */
  systemPrompt: { type: 'string', default: '' },
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
  /**
   * 'local'  → Moonshine on-device STT (~68 MB, English-leaning, streaming + VAD). Multilingual: use Cloud.
   * 'cloud'  → Groq / OpenAI Whisper API (requires key).
   * Default 'local' for zero-config active listening.
   */
  sttMode: { type: 'string', default: 'local' },
  /**
   * Mic STT language hint for Whisper-style APIs.
   * en_hi_hinglish: auto-detect + prompt bias (English, Hindi, Hinglish).
   * en / hi: force ISO language (no Hinglish prompt).
   */
  micListenLanguage: { type: 'string', default: 'en_hi_hinglish' },
  /** standard | boost — input gain + looser VAD thresholds for quiet or distant mics */
  micSensitivity: { type: 'string', default: 'standard' },
  /** false = Listen (context only, no auto AI); true = Assist (intent-based auto trigger). */
  assistAutoTrigger: { type: 'boolean', default: false },
  ocrEnabled: { type: 'boolean', default: true },
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
  /** Internal: bump DATA_EPOCH to force clearing secrets + re-consent once */
  dataEpoch: { type: 'number', default: 0 },
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

function migrateSttProviderFromLegacy() {
  try {
    const cur = store.get('sttProvider')
    if (cur && typeof cur === 'string' && cur.trim()) return
    const { NATIVE_STT_PROVIDER_IDS } = require('./transcriptionRouting')
    const chat = get('provider') || 'groq'
    if (NATIVE_STT_PROVIDER_IDS.includes(chat)) {
      set('sttProvider', chat)
      return
    }
    if (get('audioFallbackKey')) {
      const fb = get('audioFallbackProvider') || 'openai'
      set('sttProvider', fb === 'groq' ? 'groq' : 'openai')
      return
    }
    set('sttProvider', 'groq')
  } catch {
    set('sttProvider', 'groq')
  }
}

function migrateLegacySystemPrompt() {
  try {
    const { LEGACY_STORE_DEFAULT_SYSTEM_PROMPT } = require('./defaultSystemPrompt')
    const cur = get('systemPrompt')
    if (typeof cur !== 'string' || !cur.trim()) return
    if (cur.trim() === LEGACY_STORE_DEFAULT_SYSTEM_PROMPT.trim()) {
      set('systemPrompt', '')
    }
  } catch {
    // defaultSystemPrompt missing in odd builds — skip
  }
}

function runDataMigration() {
  migrateLegacySystemPrompt()
  migrateSttProviderFromLegacy()
  const epoch = typeof get('dataEpoch') === 'number' ? get('dataEpoch') : 0
  if (epoch >= DATA_EPOCH) return
  for (const k of ENCRYPTED_KEYS) {
    try {
      store.delete(k)
    } catch {
      set(k, '')
    }
  }
  set('hasCompletedOnboarding', false)
  set('consentRecord', {})
  set('consent_v1', false)
  set('dataEpoch', DATA_EPOCH)
}

module.exports = { get, set, getAll, clear, schema, runDataMigration, DATA_EPOCH }
