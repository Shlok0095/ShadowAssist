// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const crypto = require('crypto')
const providers = require('./providers')
const catalog = require('./chatModelCatalog.json')
const { TimedCache } = require('./timedCache')
const { filterActiveNvidiaChatModels, isDeprecatedNvidiaChatModel } = require('./nvidiaChatModels.cjs')

const { filterMultimodalChatModels, isMultimodalChatModel } = require('./chatMultimodalModels')

/** Avoid hammering vendor /models on every settings open. */
const modelsListCache = new TimedCache(5 * 60_000, 24)

function modelsCacheKey(provider, get) {
  const keyField = providers.getApiKeyField(provider)
  const key = keyField ? String(get(keyField) || '') : ''
  const base = providers.isOpenAICompat(provider) ? String(providers.resolveBaseURL(provider, get) || '') : ''
  const saved = savedModelForProvider(provider, get)
  const digest = crypto.createHash('sha256').update(`${key}|${base}|${saved}`).digest('hex').slice(0, 16)
  return `${provider}:${digest}`
}

/** Obvious non-chat / legacy ids returned by GET /v1/models on many hosts. */
const NON_CHAT_ID =
  /^(text-embedding|embedding-|whisper-|tts-|dall-e|davinci-|babbage-|ada$|ft:|gpt-image|omni-moderation|text-moderation|moderation-|realtime|audio-|transcribe|sora-|computer-use-preview|gpt-audio)/i

function isLikelyChatModelId(id) {
  const s = String(id || '').trim()
  if (!s || s.length > 200) return false
  if (NON_CHAT_ID.test(s)) return false
  if (/^text-|^code-search|^curie|^davinci/i.test(s)) return false
  return true
}

/** Vendor API list only; keep saved id if the account still uses one not returned. */
function finalizeModelList(apiIds, staticList, savedModel, provider) {
  const saved = String(savedModel || '').trim()
  const staticFiltered =
    provider === 'nvidia' ? filterActiveNvidiaChatModels(staticList) : staticList
  if (apiIds?.length) {
    const out = applyProviderModelPolicy(
      provider,
      apiIds.map((id) => String(id || '').trim()).filter(Boolean),
    )
    if (saved && !out.includes(saved) && isMultimodalChatModel(provider, saved)) {
      if (provider !== 'nvidia' || !isDeprecatedNvidiaChatModel(saved)) {
        out.unshift(saved)
      }
    }
    return filterMultimodalChatModels(provider, out)
  }
  return filterMultimodalChatModels(provider, mergeUnique(
    saved && isMultimodalChatModel(provider, saved)
      && (provider !== 'nvidia' || !isDeprecatedNvidiaChatModel(saved))
      ? [saved]
      : [],
    staticFiltered,
  ))
}

function mergeUnique(primary, fallback) {
  const out = []
  const seen = new Set()
  for (const id of [...(primary || []), ...(fallback || [])]) {
    const s = String(id || '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function normalizeOpenAICompatRows(json) {
  const rows = (json.data || [])
    .map((m) => ({
      id: m?.id,
      created: typeof m?.created === 'number' ? m.created : 0,
    }))
    .filter((m) => m.id && isLikelyChatModelId(m.id))
  rows.sort((a, b) => b.created - a.created || a.id.localeCompare(b.id))
  return rows.map((r) => r.id)
}

function applyProviderModelPolicy(provider, ids) {
  const filtered = filterMultimodalChatModels(provider, ids)
  if (provider === 'nvidia') return filterActiveNvidiaChatModels(filtered)
  return filtered
}

async function fetchOpenAICompatModelList(baseURL, apiKey) {
  const base = (baseURL || '').replace(/\/$/, '')
  if (!base || !apiKey) throw new Error('Missing base URL or API key')
  const r = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`Models API HTTP ${r.status}${body ? `: ${body.slice(0, 120)}` : ''}`)
  }
  const j = await r.json()
  const ids = normalizeOpenAICompatRows(j)
  if (!ids.length) throw new Error('No chat models in API response')
  return ids
}

async function fetchOpenRouterModelList() {
  const r = await fetch('https://openrouter.ai/api/v1/models')
  if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`)
  const j = await r.json()
  const ids = (j.data || [])
    .map((m) => m.id)
    .filter((id) => id && isLikelyChatModelId(id))
  if (!ids.length) throw new Error('Empty OpenRouter list')
  return ids
}

async function fetchAnthropicModelList(apiKey) {
  if (!apiKey) throw new Error('Missing API key')
  const ids = []
  let afterId = null
  for (let page = 0; page < 32; page++) {
    const url = new URL('https://api.anthropic.com/v1/models')
    url.searchParams.set('limit', '1000')
    if (afterId) url.searchParams.set('after_id', afterId)
    const r = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`Anthropic models HTTP ${r.status}${body ? `: ${body.slice(0, 120)}` : ''}`)
    }
    const j = await r.json()
    const pageIds = (j.data || []).map((m) => m.id).filter(Boolean)
    ids.push(...pageIds)
    if (!j.has_more || !pageIds.length) break
    afterId = j.last_id || pageIds[pageIds.length - 1]
  }
  const unique = [...new Set(ids)]
  if (!unique.length) throw new Error('Empty Anthropic model list')
  return unique
}

function savedModelForProvider(provider, get) {
  try {
    const field = providers.getModelField(provider)
    return field ? get(field) : ''
  } catch (_) {
    return ''
  }
}

/**
 * @param {string} provider
 * @param {(k: string) => any} get
 */
async function listRemoteModels(provider, get) {
  const staticList = catalog[provider] || []
  const savedModel = savedModelForProvider(provider, get)
  const cacheKey = modelsCacheKey(provider, get)
  const cached = modelsListCache.get(cacheKey)
  if (cached) return cached

  try {
    if (provider === 'openrouter') {
      const ids = await fetchOpenRouterModelList()
      const result = {
        ok: true,
        models: finalizeModelList(ids, staticList, savedModel, provider),
        source: 'api',
        error: null,
      }
      modelsListCache.set(cacheKey, result)
      return result
    }

    if (provider === 'anthropic') {
      const key = get('anthropicKey')
      if (!key) {
        return {
          ok: false,
          models: finalizeModelList([], staticList, savedModel, provider),
          source: 'static',
          error: 'Save Anthropic API key first, then sync.',
        }
      }
      const ids = await fetchAnthropicModelList(key)
      const result = {
        ok: true,
        models: finalizeModelList(ids, staticList, savedModel, provider),
        source: 'api',
        error: null,
      }
      modelsListCache.set(cacheKey, result)
      return result
    }

    if (provider === 'custom') {
      const key = get('customOpenaiKey')
      const base = providers.resolveBaseURL('custom', get)
      if (!key) {
        return {
          ok: false,
          models: finalizeModelList([], staticList, savedModel, provider),
          source: 'static',
          error: 'Save custom API key first.',
        }
      }
      const ids = await fetchOpenAICompatModelList(base, key)
      return {
        ok: true,
        models: finalizeModelList(ids, staticList, savedModel, provider),
        source: 'api',
        error: null,
      }
    }

    if (!providers.isOpenAICompat(provider)) {
      return {
        ok: false,
        models: finalizeModelList([], staticList, savedModel, provider),
        source: 'static',
        error: 'This vendor has no models listing API in-app; use static list or type a model id.',
      }
    }

    const keyField = providers.getApiKeyField(provider)
    const key = get(keyField)
    const base = providers.resolveBaseURL(provider, get)
    if (!key) {
      return {
        ok: false,
        models: finalizeModelList([], staticList, savedModel, provider),
        source: 'static',
        error: `Save ${provider} API key first, then sync.`,
      }
    }
    const ids = applyProviderModelPolicy(provider, await fetchOpenAICompatModelList(base, key))
    const result = {
      ok: true,
      models: finalizeModelList(ids, staticList, savedModel, provider),
      source: 'api',
      error: null,
    }
    modelsListCache.set(cacheKey, result)
    return result
  } catch (e) {
    return {
      ok: false,
      models: finalizeModelList([], staticList, savedModel, provider),
      source: 'static',
      error: e.message || 'Failed to fetch models',
    }
  }
}

function invalidateRemoteModelsCache(provider) {
  if (!provider) {
    modelsListCache.clear()
    return
  }
  modelsListCache.deleteByPrefix(`${provider}:`)
}

module.exports = { listRemoteModels, catalog, invalidateRemoteModelsCache }
