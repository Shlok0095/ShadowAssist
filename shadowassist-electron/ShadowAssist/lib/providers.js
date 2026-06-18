// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * AI vendor registry — base URLs and store field mapping.
 * OpenAI-compatible vendors use the official OpenAI Node SDK with baseURL.
 */

const REGISTRY = {
  groq: {
    kind: 'openai_compat',
    baseURL: 'https://api.groq.com/openai/v1',
    keyField: 'groqKey',
    modelField: 'groqModel',
    defaultModel: 'llama-3.3-70b-versatile',
    testModel: 'llama-3.1-8b-instant',
    vision: false,
    ui: { label: 'Groq', badge: 'FAST', color: '#22c55e', desc: 'Llama — low latency', docs: 'https://console.groq.com/keys' },
  },
  openai: {
    kind: 'openai_compat',
    baseURL: 'https://api.openai.com/v1',
    keyField: 'apiKey',
    modelField: 'selectedModel',
    defaultModel: 'gpt-4o',
    testModel: 'gpt-4o-mini',
    vision: true,
    ui: { label: 'OpenAI', badge: '4o', color: '#38bdf8', desc: 'GPT-4o + vision', docs: 'https://platform.openai.com/api-keys' },
  },
  nvidia: {
    kind: 'openai_compat',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    keyField: 'nvidiaKey',
    modelField: 'nvidiaModel',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    testModel: 'meta/llama-3.3-70b-instruct',
    vision: false,
    ui: { label: 'NVIDIA NIM', badge: 'NIM', color: '#a78bfa', desc: 'Hosted Llama / Qwen', docs: 'https://build.nvidia.com/' },
  },
  anthropic: {
    kind: 'anthropic',
    keyField: 'anthropicKey',
    modelField: 'anthropicModel',
    defaultModel: 'claude-3-5-sonnet-20241022',
    testModel: 'claude-3-5-haiku-20241022',
    vision: true,
    ui: { label: 'Anthropic', badge: 'Claude', color: '#d97757', desc: 'Claude — reasoning + vision', docs: 'https://console.anthropic.com/' },
  },
  deepseek: {
    kind: 'openai_compat',
    baseURL: 'https://api.deepseek.com/v1',
    keyField: 'deepseekKey',
    modelField: 'deepseekModel',
    defaultModel: 'deepseek-chat',
    testModel: 'deepseek-chat',
    vision: false,
    ui: { label: 'DeepSeek', badge: 'V3', color: '#60a5fa', desc: 'OpenAI-compatible API', docs: 'https://platform.deepseek.com/' },
  },
  moonshot: {
    kind: 'openai_compat',
    baseURL: 'https://api.moonshot.ai/v1',
    keyField: 'moonshotKey',
    modelField: 'moonshotModel',
    defaultModel: 'moonshot-v1-8k',
    testModel: 'moonshot-v1-8k',
    vision: false,
    ui: { label: 'Kimi (Moonshot)', badge: 'Kimi', color: '#f472b6', desc: 'Global api.moonshot.ai — China: .cn', docs: 'https://platform.moonshot.ai/' },
  },
  mistral: {
    kind: 'openai_compat',
    baseURL: 'https://api.mistral.ai/v1',
    keyField: 'mistralKey',
    modelField: 'mistralModel',
    defaultModel: 'mistral-small-latest',
    testModel: 'mistral-small-latest',
    vision: false,
    ui: { label: 'Mistral', badge: 'EU', color: '#f59e0b', desc: 'La Plateforme', docs: 'https://console.mistral.ai/' },
  },
  xai: {
    kind: 'openai_compat',
    baseURL: 'https://api.x.ai/v1',
    keyField: 'xaiKey',
    modelField: 'xaiModel',
    defaultModel: 'grok-2-latest',
    testModel: 'grok-2-latest',
    vision: false,
    ui: { label: 'xAI', badge: 'Grok', color: '#e5e5e5', desc: 'Grok API', docs: 'https://console.x.ai/' },
  },
  openrouter: {
    kind: 'openai_compat',
    baseURL: 'https://openrouter.ai/api/v1',
    keyField: 'openrouterKey',
    modelField: 'openrouterModel',
    defaultModel: 'openai/gpt-4o-mini',
    testModel: 'openai/gpt-4o-mini',
    vision: false,
    ui: { label: 'OpenRouter', badge: 'HUB', color: '#a855f7', desc: 'Many models — one key', docs: 'https://openrouter.ai/keys' },
  },
  together: {
    kind: 'openai_compat',
    baseURL: 'https://api.together.xyz/v1',
    keyField: 'togetherKey',
    modelField: 'togetherModel',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    testModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    vision: false,
    ui: { label: 'Together AI', badge: 'OSS', color: '#14b8a6', desc: 'Open models hosted', docs: 'https://api.together.xyz/' },
  },
  perplexity: {
    kind: 'openai_compat',
    baseURL: 'https://api.perplexity.ai/v1',
    keyField: 'perplexityKey',
    modelField: 'perplexityModel',
    defaultModel: 'sonar',
    testModel: 'sonar',
    vision: false,
    ui: { label: 'Perplexity', badge: 'Sonar', color: '#22d3ee', desc: 'Search-grounded chat', docs: 'https://docs.perplexity.ai/' },
  },
  google: {
    kind: 'openai_compat',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyField: 'googleKey',
    modelField: 'googleModel',
    defaultModel: 'gemini-2.0-flash',
    testModel: 'gemini-2.0-flash',
    vision: true,
    ui: { label: 'Google Gemini', badge: 'Gemini', color: '#4285f4', desc: 'OpenAI-compat endpoint', docs: 'https://ai.google.dev/' },
  },
  fireworks: {
    kind: 'openai_compat',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    keyField: 'fireworksKey',
    modelField: 'fireworksModel',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    testModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    vision: false,
    ui: { label: 'Fireworks', badge: 'FW', color: '#fb7185', desc: 'Fast inference', docs: 'https://fireworks.ai/' },
  },
  cerebras: {
    kind: 'openai_compat',
    baseURL: 'https://api.cerebras.ai/v1',
    keyField: 'cerebrasKey',
    modelField: 'cerebrasModel',
    defaultModel: 'llama3.1-8b',
    testModel: 'llama3.1-8b',
    vision: false,
    ui: { label: 'Cerebras', badge: 'CB', color: '#84cc16', desc: 'Wafer-scale inference', docs: 'https://inference.cerebras.ai/' },
  },
  custom: {
    kind: 'openai_compat',
    baseURLFromStore: 'customOpenaiBaseUrl',
    keyField: 'customOpenaiKey',
    modelField: 'customOpenaiModel',
    defaultModel: 'gpt-4o',
    testModelFromModel: true,
    vision: false,
    ui: {
      label: 'Custom (OpenAI-compat)',
      badge: 'URL',
      color: '#94a3b8',
      desc: 'Any /v1 base — Azure, local, etc.',
      docs: 'https://platform.openai.com/docs/api-reference',
    },
  },
}

const ORDER = [
  'groq',
  'openai',
  'anthropic',
  'deepseek',
  'moonshot',
  'mistral',
  'xai',
  'openrouter',
  'together',
  'perplexity',
  'google',
  'fireworks',
  'cerebras',
  'nvidia',
  'custom',
]

function getEntry(provider) {
  return REGISTRY[provider] || REGISTRY.openai
}

function resolveBaseURL(provider, getStore) {
  const e = getEntry(provider)
  if (e.baseURLFromStore) {
    const raw = (getStore(e.baseURLFromStore) || '').trim().replace(/\/$/, '')
    return raw || 'https://api.openai.com/v1'
  }
  return e.baseURL
}

function getApiKeyField(provider) {
  return getEntry(provider).keyField
}

function getModelField(provider) {
  return getEntry(provider).modelField
}

function getModelForProvider(provider, getStore) {
  const e = getEntry(provider)
  const field = e.modelField
  return (getStore(field) || e.defaultModel || 'gpt-4o').trim()
}

function getTestModel(provider, getStore) {
  const e = getEntry(provider)
  if (e.testModelFromModel) return getModelForProvider(provider, getStore) || e.defaultModel
  return e.testModel || e.defaultModel
}

function isAnthropic(provider) {
  return getEntry(provider).kind === 'anthropic'
}

function isOpenAICompat(provider) {
  return getEntry(provider).kind === 'openai_compat'
}

function supportsVision(provider) {
  return !!getEntry(provider).vision
}

/** Groq & OpenAI host Whisper-compatible transcription with app keys */
function usesBuiltInWhisper(provider) {
  return provider === 'groq' || provider === 'openai'
}

function getProviderMetadataForUI() {
  return ORDER.filter((id) => REGISTRY[id]).map((id) => {
    const e = REGISTRY[id]
    return {
      id,
      kind: e.kind,
      keyField: e.keyField,
      modelField: e.modelField,
      ...e.ui,
      defaultModel: e.defaultModel,
      modelHint: e.defaultModel,
      usesCustomBase: !!e.baseURLFromStore,
    }
  })
}

const STT_CAPABLE_IDS = ['groq', 'openai', 'together', 'mistral', 'fireworks', 'nvidia']

function getSttProviderMetadataForUI() {
  return getProviderMetadataForUI().filter((p) => STT_CAPABLE_IDS.includes(p.id))
}

module.exports = {
  REGISTRY,
  ORDER,
  getEntry,
  resolveBaseURL,
  getApiKeyField,
  getModelField,
  getModelForProvider,
  getTestModel,
  isAnthropic,
  isOpenAICompat,
  supportsVision,
  usesBuiltInWhisper,
  getProviderMetadataForUI,
  getSttProviderMetadataForUI,
  STT_CAPABLE_IDS,
}
