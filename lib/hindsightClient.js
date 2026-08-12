// Copyright (c) 2026 VeilAssist. All rights reserved.
// Hybrid recall — vector + local keyword memory + optional external Hindsight vector API.

const { tokenize } = require('./meetingRecall')
const { TimedCache } = require('./timedCache')

const DEFAULT_TIMEOUT_MS = 800
const recallCache = new TimedCache(45_000, 48)

function recallCacheKey(input) {
  return [
    String(input.query || '').trim().slice(0, 240),
    input.useMeetingSummary ? 1 : 0,
    input.useHindsightRecall ? 1 : 0,
    input.useHybridRag ? 1 : 0,
    input.promptId || '',
    input.maxResults || 6,
  ].join('|')
}

/**
 * Score transcript lines for in-meeting / hybrid search.
 * @param {string} query
 * @param {Array<{ text?: string, at?: number }>} lines
 * @param {{ maxResults?: number }} [opts]
 */
function searchTranscriptLines(query, lines, opts = {}) {
  const maxResults = Math.max(1, Math.min(8, opts.maxResults || 5))
  const terms = tokenize(query)
  const list = Array.isArray(lines) ? lines : []
  if (!terms.length || !list.length) return []

  const scored = []
  for (const line of list) {
    const blob = String(line?.text || '').toLowerCase()
    if (!blob) continue
    let score = 0
    for (const t of terms) {
      if (blob.includes(t)) score += 1
    }
    if (score <= 0) continue
    scored.push({
      text: String(line.text || '').trim().slice(0, 500),
      score,
      at: line.at || 0,
      source: 'live_transcript',
    })
  }
  scored.sort((a, b) => b.score - a.score || b.at - a.at)
  return scored.slice(0, maxResults)
}

/**
 * @param {object} deps
 */
function createHindsightClient({
  store,
  longTermMemory,
  meetingRecall,
  meetingSessions,
  sessionRecorder,
  contextVectorStore,
  vectorMemory,
  hindsightAdapter,
}) {
  /**
   * @param {object} input
   */
  async function hybridRecall(input = {}) {
    const query = String(input.query || '').trim()
    if (!query) return { matches: [], block: '' }

    const cacheKey = recallCacheKey(input)
    const cached = recallCache.get(cacheKey)
    if (cached) return cached

    const maxResults = Math.max(1, Math.min(10, input.maxResults || 6))
    const timeoutMs = Math.min(2500, Math.max(100, input.timeoutMs || DEFAULT_TIMEOUT_MS))

    const localPromise = (async () => {
      /** @type {Array<{ text: string, score: number, source: string }>} */
      const merged = []

      const useVector =
        (input.forceVectorMemory === true ||
          (input.useVectorMemory !== false && vectorMemory?.isEnabled?.())) &&
        (input.useMeetingSummary || input.useHindsightRecall || input.useHybridRag)

      if (useVector && vectorMemory) {
        const vecHits = await vectorMemory.recall(query, {
          topK: Math.min(6, maxResults),
          timeoutMs,
        })
        for (const h of vecHits) {
          merged.push({
            text: h.text,
            score: (h.score || 1) * 2.8,
            source: h.source || 'vector_memory',
          })
        }
      }

      if (input.useMeetingSummary && meetingSessions) {
        const sessions = meetingSessions.list()
        const hits = meetingRecall.searchMeetingSessions(sessions, query, { maxResults: 3 })
        for (const h of hits) {
          merged.push({
            text: String(h.summary || h.snippet || h.transcriptPreview || '').trim().slice(0, 1200),
            score: (h.score || 1) * 2,
            source: 'meeting_session',
          })
        }
      }

      if (input.useHindsightRecall && longTermMemory) {
        const ltm = await longTermMemory.recall(query, { maxResults: 4, timeoutMs })
        for (const m of ltm) {
          merged.push({ text: m.text, score: (m.score || 1) * 1.5, source: m.source || 'long_term_memory' })
        }
      }

      if (input.useHybridRag && sessionRecorder?.isActive?.()) {
        const blob = sessionRecorder.recentTranscriptText(120)
        if (blob) {
          const lines = blob.split('\n').filter(Boolean).map((text, i) => ({ text, at: Date.now() - i * 1000 }))
          const live = searchTranscriptLines(query, lines, { maxResults: 4 })
          for (const l of live) merged.push({ text: l.text, score: l.score * 1.2, source: 'live_transcript' })
        }
      }

      if (input.useHybridRag && input.promptId && contextVectorStore) {
        const chunks = contextVectorStore.retrieveChunks(input.promptId, query, { topK: 4 }, store)
        for (const c of chunks) {
          merged.push({
            text: String(c.text || '').trim().slice(0, 800),
            score: (c.score || 1) * 1.1,
            source: `reference:${c.fileName || 'file'}`,
          })
        }
      }

      merged.sort((a, b) => b.score - a.score)
      const deduped = []
      const seen = new Set()
      for (const m of merged) {
        const key = m.text.slice(0, 100).toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(m)
        if (deduped.length >= maxResults) break
      }
      return deduped
    })()

    const provider = String(store.get('hindsightProvider') || 'off')
    if (provider === 'hindsight' && hindsightAdapter) {
      const ext = await hindsightAdapter.recall(query, {
        maxResults,
        timeoutMs,
        scope: { userId: 'local' },
      })
      if (ext.length) {
        const result = { matches: ext.slice(0, maxResults), block: formatHybridBlock(ext) }
        recallCache.set(cacheKey, result, 45_000)
        return result
      }
      const matches = await localPromise
      const result = { matches, block: formatHybridBlock(matches) }
      recallCache.set(cacheKey, result, 45_000)
      return result
    }

    const externalUrl =
      provider === 'gateway'
        ? String(store.get('hindsightApiUrl') || '').trim()
        : ''
    const externalKey = String(store.get('hindsightApiKey') || process.env.HINDSIGHT_API_KEY || '').trim()

    if (!externalUrl) {
      const matches = await localPromise
      const result = { matches, block: formatHybridBlock(matches) }
      recallCache.set(cacheKey, result, 45_000)
      return result
    }

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(`${externalUrl.replace(/\/$/, '')}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(externalKey ? { Authorization: `Bearer ${externalKey}` } : {}),
        },
        body: JSON.stringify({ query, maxResults }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        const ext = Array.isArray(data?.matches)
          ? data.matches.map((m) => ({
              text: String(m.text || m.content || '').slice(0, 2000),
              score: Number(m.score) || 1,
              source: m.source || 'hindsight_api',
            }))
          : []
        if (ext.length) {
          const result = { matches: ext.slice(0, maxResults), block: formatHybridBlock(ext) }
          recallCache.set(cacheKey, result, 45_000)
          return result
        }
      }
    } catch (e) {
      console.warn('[hindsight] external recall failed:', e?.message || e)
    }

    const matches = await localPromise
    const result = { matches, block: formatHybridBlock(matches) }
    recallCache.set(cacheKey, result, 45_000)
    return result
  }

  function retain(item) {
    const content = String(item?.content || '').trim()
    if (!content) return false
    const provider = String(store.get('hindsightProvider') || 'off')
    if (provider === 'hindsight' && hindsightAdapter) return hindsightAdapter.retain(item)
    if (provider !== 'gateway') return false
    const externalUrl = String(store.get('hindsightApiUrl') || '').trim()
    if (!externalUrl) return false
    const externalKey = String(store.get('hindsightApiKey') || '').trim()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    void fetch(`${externalUrl.replace(/\/$/, '')}/retain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(externalKey ? { Authorization: `Bearer ${externalKey}` } : {}),
      },
      body: JSON.stringify(item),
      signal: controller.signal,
    })
      .catch((error) => console.warn('[hindsight] gateway retain failed:', error?.message || error))
      .finally(() => clearTimeout(timer))
    return true
  }

  return { hybridRecall, searchTranscriptLines, retain }
}

/**
 * @param {Array<{ text: string, source?: string, score?: number }>} matches
 */
function formatHybridBlock(matches) {
  if (!Array.isArray(matches) || !matches.length) return ''
  const parts = matches.map((m, i) => {
    const tag = m.source ? ` (${m.source})` : ''
    return `- Recall ${i + 1}${tag}: ${m.text}`
  })
  return `\n\n---\n## MEMORY RECALL (facts only — do not invent)\n${parts.join('\n')}`
}

module.exports = {
  createHindsightClient,
  formatHybridBlock,
  searchTranscriptLines,
}
