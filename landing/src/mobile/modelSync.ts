import type { AppSettings } from './profileTypes'
import type { AiProviderId } from './providerRegistry'
import {
  getChatBaseUrl,
  getChatProviderMeta,
  getProviderApiKey,
  getProviderModel,
} from './providerRegistry'
import { CHAT_MODEL_CATALOG } from './modelCatalog'

const NON_CHAT_ID =
  /^(text-embedding|embedding-|whisper-|tts-|dall-e|davinci-|babbage-|ada$|ft:|gpt-image|omni-moderation|text-moderation|moderation-|realtime|audio-|transcribe|sora-)/i

function isLikelyChatModelId(id: string): boolean {
  const s = String(id || '').trim()
  if (!s || s.length > 200) return false
  if (NON_CHAT_ID.test(s)) return false
  return true
}

function mergeModels(apiIds: string[], staticList: string[], saved: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    const s = String(id || '').trim()
    if (!s || seen.has(s)) return
    seen.add(s)
    out.push(s)
  }
  if (saved) add(saved)
  for (const id of apiIds) add(id)
  for (const id of staticList) add(id)
  return out
}

async function fetchOpenAICompatModels(baseURL: string, apiKey: string): Promise<string[]> {
  const base = baseURL.replace(/\/$/, '')
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Models API (${res.status}): ${text.slice(0, 120)}`)
  const json = JSON.parse(text)
  const ids = (json.data || [])
    .map((m: { id?: string }) => m?.id)
    .filter((id: string) => id && isLikelyChatModelId(id))
  if (!ids.length) throw new Error('No chat models returned')
  return ids
}

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Anthropic models (${res.status})`)
  const json = JSON.parse(text)
  const ids = (json.data || []).map((m: { id?: string }) => m.id).filter(Boolean)
  if (!ids.length) throw new Error('Empty Anthropic model list')
  return ids
}

async function fetchOpenRouterModels(): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  if (!res.ok) throw new Error(`OpenRouter models (${res.status})`)
  const json = await res.json()
  const ids = (json.data || [])
    .filter((m: { id?: string; architecture?: { modality?: string } }) => {
      const mod = m?.architecture?.modality || ''
      return m?.id && isLikelyChatModelId(m.id) && /image/i.test(mod)
    })
    .map((m: { id: string }) => m.id)
  if (!ids.length) throw new Error('Empty OpenRouter vision list')
  return ids
}

export type ModelSyncResult = {
  models: string[]
  source: 'api' | 'static'
  error?: string
}

function isMobileApk(): boolean {
  return Boolean(import.meta.env.VITE_MOBILE_APK)
}

export async function syncChatModels(
  provider: AiProviderId,
  settings: AppSettings,
): Promise<ModelSyncResult> {
  const staticList = CHAT_MODEL_CATALOG[provider] || []
  const saved = getProviderModel(settings, provider)

  // Mobile APK: curated per-vendor lists only (no remote model sync).
  if (isMobileApk()) {
    return {
      models: mergeModels([], staticList, saved),
      source: 'static',
    }
  }

  const key = getProviderApiKey(settings, provider)

  try {
    if (provider === 'openrouter') {
      const ids = await fetchOpenRouterModels()
      return { models: mergeModels(ids, staticList, saved), source: 'api' }
    }
    if (provider === 'anthropic') {
      if (!key) {
        return {
          models: mergeModels([], staticList, saved),
          source: 'static',
          error: 'Save API key first, then sync.',
        }
      }
      const ids = await fetchAnthropicModels(key)
      return { models: mergeModels(ids, staticList, saved), source: 'api' }
    }
    const meta = getChatProviderMeta(provider)
    if (meta.kind === 'openai_compat' || provider === 'custom') {
      if (!key) {
        return {
          models: mergeModels([], staticList, saved),
          source: 'static',
          error: 'Save API key first, then sync.',
        }
      }
      const base = getChatBaseUrl(settings, provider)
      const ids = await fetchOpenAICompatModels(base, key)
      return { models: mergeModels(ids, staticList, saved), source: 'api' }
    }
    return { models: mergeModels([], staticList, saved), source: 'static' }
  } catch (e) {
    return {
      models: mergeModels([], staticList, saved),
      source: 'static',
      error: e instanceof Error ? e.message : 'Sync failed',
    }
  }
}
