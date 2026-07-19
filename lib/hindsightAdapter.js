// Copyright (c) 2026 VeilAssist. All rights reserved.
// Optional genuine Hindsight retain/recall adapter.

const DEFAULT_TIMEOUT_MS = 800
const HEALTH_TTL_MS = 30_000

function createHindsightAdapter({ store }) {
  let client = null
  let clientKey = ''
  let healthy = false
  let checkedAt = 0
  let retainChain = Promise.resolve()

  function config() {
    if (store.get('hindsightProvider') !== 'hindsight') return null
    const baseUrl = String(store.get('hindsightApiUrl') || process.env.HINDSIGHT_API_URL || '').trim()
    if (!baseUrl) return null
    return {
      baseUrl: baseUrl.replace(/\/+$/, ''),
      apiKey: String(store.get('hindsightApiKey') || process.env.HINDSIGHT_API_KEY || '').trim() || undefined,
      bankId: String(store.get('hindsightBankId') || 'veilassist-local').trim() || 'veilassist-local',
    }
  }

  function getClient() {
    const cfg = config()
    if (!cfg) return null
    const key = `${cfg.baseUrl}|${cfg.apiKey || ''}`
    if (client && clientKey === key) return { client, cfg }
    try {
      const { HindsightClient } = require('@vectorize-io/hindsight-client')
      client = new HindsightClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey })
      clientKey = key
      healthy = false
      checkedAt = 0
      return { client, cfg }
    } catch (error) {
      console.warn('[hindsight-adapter] client unavailable:', error?.message || error)
      return null
    }
  }

  async function healthCheck({ force = false } = {}) {
    const resolved = getClient()
    if (!resolved) return false
    if (!force && checkedAt && Date.now() - checkedAt < HEALTH_TTL_MS) return healthy
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1000)
    try {
      const response = await fetch(`${resolved.cfg.baseUrl}/health`, {
        signal: controller.signal,
        headers: resolved.cfg.apiKey ? { Authorization: `Bearer ${resolved.cfg.apiKey}` } : {},
      })
      healthy = response.ok
    } catch {
      healthy = false
    } finally {
      clearTimeout(timer)
      checkedAt = Date.now()
    }
    return healthy
  }

  function tagsFor(scope = {}, source, mode) {
    return [
      `app:veilassist`,
      scope.userId ? `user:${scope.userId}` : 'user:local',
      scope.sessionId ? `session:${scope.sessionId}` : null,
      scope.meetingId ? `meeting:${scope.meetingId}` : null,
      source ? `source:${source}` : null,
      mode ? `mode:${mode}` : null,
    ].filter(Boolean)
  }

  function retain(item) {
    const resolved = getClient()
    const content = String(item?.content || '').trim()
    if (!resolved || !content) return false
    retainChain = retainChain
      .then(async () => {
        if (!(await healthCheck())) return
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 2500)
        try {
          await resolved.client.retain(resolved.cfg.bankId, content.slice(0, 12_000), {
            tags: tagsFor(item.scope, item.source, item.mode),
            async: true,
            timestamp: new Date(Number(item.timestamp) || Date.now()).toISOString(),
            signal: controller.signal,
          })
        } catch (error) {
          console.warn('[hindsight-adapter] retain failed:', error?.message || error)
        } finally {
          clearTimeout(timer)
        }
      })
      .catch(() => {})
    return true
  }

  async function recall(query, options = {}) {
    const resolved = getClient()
    const text = String(query || '').trim()
    if (!resolved || !text || !(await healthCheck())) return []
    const timeoutMs = Math.max(100, Math.min(2500, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let raceTimer = null
    try {
      const maxResults = Math.max(1, Math.min(12, Number(options.maxResults) || 6))
      const tags = tagsFor(options.scope)
      const response = await Promise.race([
        resolved.client.recall(resolved.cfg.bankId, text, {
          ...(tags.length ? { tags, tagsMatch: 'all_strict' } : {}),
          maxTokens: Math.max(256, maxResults * 120),
          signal: controller.signal,
        }),
        new Promise((resolve) => {
          raceTimer = setTimeout(() => resolve({ results: [] }), timeoutMs)
        }),
      ])
      return (Array.isArray(response?.results) ? response.results : [])
        .map((result) => {
          const base = String(result?.text || '').trim()
          const context = String(result?.context || '').trim()
          return {
            text: context && !base.includes(context) ? `${base} (${context})` : base,
            source: result?.type ? `hindsight:${result.type}` : 'hindsight',
            score: 1,
          }
        })
        .filter((result) => result.text)
        .slice(0, maxResults)
    } catch (error) {
      console.warn('[hindsight-adapter] recall failed:', error?.message || error)
      return []
    } finally {
      clearTimeout(timer)
      if (raceTimer) clearTimeout(raceTimer)
    }
  }

  async function flush() {
    try {
      await retainChain
    } catch {}
  }

  async function clearAll() {
    const resolved = getClient()
    if (!resolved || !(await healthCheck())) return { ok: false, skipped: true }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    try {
      await resolved.client.deleteBank(resolved.cfg.bankId, { signal: controller.signal })
      await resolved.client.createBank(resolved.cfg.bankId, {
        name: 'VeilAssist local memory',
        signal: controller.signal,
      })
      return { ok: true }
    } catch (error) {
      console.warn('[hindsight-adapter] clear failed:', error?.message || error)
      return { ok: false, error: error?.message || String(error) }
    } finally {
      clearTimeout(timer)
    }
  }

  function status() {
    const cfg = config()
    return {
      provider: cfg ? 'hindsight' : 'off',
      configured: !!cfg,
      healthy,
      checkedAt,
      baseUrl: cfg?.baseUrl || '',
      bankId: cfg?.bankId || '',
    }
  }

  return { healthCheck, retain, recall, clearAll, flush, status }
}

module.exports = { createHindsightAdapter, DEFAULT_TIMEOUT_MS, HEALTH_TTL_MS }
