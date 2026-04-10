// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const providers = require('./providers')
const catalog = require('./chatModelCatalog.json')

function mergeUnique(primary, fallback) {
  const out = []
  const seen = new Set()
  for (const id of [...(primary || []), ...(fallback || [])]) {
    const s = String(id || '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

async function fetchOpenAICompatModelList(baseURL, apiKey) {
  const base = (baseURL || '').replace(/\/$/, '')
  if (!base || !apiKey) throw new Error('Missing base URL or API key')
  const r = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!r.ok) throw new Error(`Models API HTTP ${r.status}`)
  const j = await r.json()
  const ids = (j.data || []).map((m) => m.id).filter(Boolean)
  if (!ids.length) throw new Error('Empty model list')
  return ids
}

async function fetchOpenRouterModelList() {
  const r = await fetch('https://openrouter.ai/api/v1/models')
  if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`)
  const j = await r.json()
  const ids = (j.data || []).map((m) => m.id).filter(Boolean)
  if (!ids.length) throw new Error('Empty OpenRouter list')
  return ids
}

async function fetchAnthropicModelList(apiKey) {
  if (!apiKey) throw new Error('Missing API key')
  const r = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  })
  if (!r.ok) throw new Error(`Anthropic models HTTP ${r.status}`)
  const j = await r.json()
  const ids = (j.data || []).map((m) => m.id).filter(Boolean)
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}

/**
 * @param {string} provider
 * @param {(k: string) => any} get
 */
async function listRemoteModels(provider, get) {
  const staticList = catalog[provider] || []

  try {
    if (provider === 'openrouter') {
      const ids = await fetchOpenRouterModelList()
      return { ok: true, models: mergeUnique(ids, staticList), source: 'api', error: null }
    }

    if (provider === 'anthropic') {
      const key = get('anthropicKey')
      if (!key) {
        return { ok: false, models: staticList, source: 'static', error: 'Save Anthropic API key first, then sync.' }
      }
      const ids = await fetchAnthropicModelList(key)
      return { ok: true, models: mergeUnique(ids, staticList), source: 'api', error: null }
    }

    if (provider === 'custom') {
      const key = get('customOpenaiKey')
      const base = providers.resolveBaseURL('custom', get)
      if (!key) {
        return { ok: false, models: staticList, source: 'static', error: 'Save custom API key first.' }
      }
      const ids = await fetchOpenAICompatModelList(base, key)
      return { ok: true, models: mergeUnique(ids, staticList), source: 'api', error: null }
    }

    if (!providers.isOpenAICompat(provider)) {
      return { ok: false, models: staticList, source: 'static', error: 'This vendor has no standard models listing in-app; use static list or type an id.' }
    }

    const keyField = providers.getApiKeyField(provider)
    const key = get(keyField)
    const base = providers.resolveBaseURL(provider, get)
    if (!key) {
      return { ok: false, models: staticList, source: 'static', error: `Save ${provider} API key first, then sync.` }
    }
    const ids = await fetchOpenAICompatModelList(base, key)
    return { ok: true, models: mergeUnique(ids, staticList), source: 'api', error: null }
  } catch (e) {
    return {
      ok: false,
      models: staticList,
      source: 'static',
      error: e.message || 'Failed to fetch models',
    }
  }
}

module.exports = { listRemoteModels, catalog }
