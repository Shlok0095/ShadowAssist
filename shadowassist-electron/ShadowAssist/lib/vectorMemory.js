// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 6 — semantic recall over past meeting chunks; keyword fallback always available.

const fs = require('fs')
const path = require('path')
const { tokenize } = require('./meetingRecall')
const {
  chunkText,
  cosineSimilarity,
  keywordOverlapScore,
  buildSessionIndexText,
} = require('./vectorMemoryUtils')

const INDEX_VERSION = 1
const MAX_CHUNKS = 3200
const EMBED_BATCH = 6

/**
 * @param {{ memoryRoot: string, store: { get: Function }, embedClient?: { embedTexts: Function, embedText: Function } }} opts
 */
function createVectorMemoryStore({ memoryRoot, store, embedClient = null }) {
  const indexPath = path.join(memoryRoot, 'vector-index.json')

  function ensureRoot() {
    if (!fs.existsSync(memoryRoot)) fs.mkdirSync(memoryRoot, { recursive: true })
  }

  function loadIndex() {
    ensureRoot()
    try {
      if (!fs.existsSync(indexPath)) return { version: INDEX_VERSION, chunks: [] }
      const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      if (!raw || raw.version !== INDEX_VERSION || !Array.isArray(raw.chunks)) {
        return { version: INDEX_VERSION, chunks: [] }
      }
      return raw
    } catch {
      return { version: INDEX_VERSION, chunks: [] }
    }
  }

  function saveIndex(index) {
    ensureRoot()
    const tmp = `${indexPath}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(index, null, 0), 'utf8')
    fs.renameSync(tmp, indexPath)
  }

  function isEnabled() {
    return store.get('vectorMemoryEnabled') === true
  }

  function removeSession(sessionId) {
    const id = String(sessionId || '').trim()
    if (!id) return
    const index = loadIndex()
    index.chunks = index.chunks.filter((c) => c.sessionId !== id)
    saveIndex(index)
  }

  /**
   * @param {object} session Saved meeting session
   */
  async function indexSession(session) {
    if (!isEnabled() || !session?.id) return { ok: false, reason: 'disabled' }
    const sessionId = String(session.id)
    removeSession(sessionId)

    const blob = buildSessionIndexText(session)
    const pieces = chunkText(blob)
    if (!pieces.length) return { ok: false, reason: 'empty' }

    /** @type {Array<{ id: string, sessionId: string, modeName: string, startedAt: number, text: string, embedding: number[] | null }>} */
    const newChunks = pieces.map((text, i) => ({
      id: `vc-${sessionId}-${i}-${Date.now().toString(36)}`,
      sessionId,
      modeName: String(session.modeName || 'Session').slice(0, 64),
      startedAt: Number(session.startedAt) || Date.now(),
      text: text.slice(0, 4000),
      embedding: null,
    }))

    if (embedClient) {
      try {
        for (let i = 0; i < newChunks.length; i += EMBED_BATCH) {
          const batch = newChunks.slice(i, i + EMBED_BATCH)
          const vectors = await embedClient.embedTexts(batch.map((c) => c.text))
          for (let j = 0; j < batch.length; j++) {
            const vec = vectors[j]
            if (Array.isArray(vec) && vec.length) batch[j].embedding = vec
          }
        }
      } catch (e) {
        console.warn('[vector-memory] embed index failed (keyword fallback kept):', e?.message || e)
      }
    }

    const index = loadIndex()
    index.chunks = [...newChunks, ...index.chunks.filter((c) => c.sessionId !== sessionId)]
    while (index.chunks.length > MAX_CHUNKS) index.chunks.pop()
    saveIndex(index)
    return { ok: true, chunks: newChunks.length }
  }

  /**
   * @param {Array<object>} sessions
   */
  async function migrateExistingSessions(sessions) {
    if (!isEnabled()) return { ok: false, skipped: true }
    const list = Array.isArray(sessions) ? sessions : []
    let indexed = 0
    for (const s of list) {
      const r = await indexSession(s)
      if (r.ok) indexed += 1
    }
    return { ok: true, indexed }
  }

  /**
   * @param {string} query
   * @param {{ topK?: number, timeoutMs?: number }} [opts]
   */
  async function recall(query, opts = {}) {
    if (!isEnabled()) return []
    const q = String(query || '').trim()
    if (!q) return []
    const topK = Math.max(1, Math.min(12, opts.topK || 6))
    const timeoutMs = Math.min(3000, Math.max(100, opts.timeoutMs || 800))

    return Promise.race([
      recallInner(q, topK),
      new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ])
  }

  async function recallInner(query, topK) {
    const index = loadIndex()
    const chunks = index.chunks || []
    if (!chunks.length) return []

    let queryVec = null
    if (embedClient) {
      try {
        queryVec = await embedClient.embedText(query)
        if (!Array.isArray(queryVec) || !queryVec.length) queryVec = null
      } catch (_) {
        queryVec = null
      }
    }

    const scored = []
    for (const c of chunks) {
      const text = String(c.text || '').trim()
      if (!text) continue
      let score = 0
      if (queryVec && Array.isArray(c.embedding) && c.embedding.length === queryVec.length) {
        score = cosineSimilarity(queryVec, c.embedding)
      } else {
        score = keywordOverlapScore(query, text)
      }
      if (score <= 0) continue
      scored.push({
        text: text.slice(0, 1600),
        score,
        source: 'vector_memory',
        sessionId: c.sessionId,
        modeName: c.modeName,
        startedAt: c.startedAt || 0,
      })
    }

    scored.sort((a, b) => b.score - a.score || (b.startedAt || 0) - (a.startedAt || 0))
    return scored.slice(0, topK)
  }

  /**
   * Past meetings only — vector + keyword on stored chunks (for overlay search pill).
   * @param {string} query
   * @param {{ maxResults?: number, meetingSessions?: object[] }} [opts]
   */
  async function searchPastMeetings(query, opts = {}) {
    const q = String(query || '').trim()
    if (!q) return []
    const maxResults = Math.max(1, Math.min(10, opts.maxResults || 6))
    /** @type {Map<string, { text: string, score: number, source: string, sessionId?: string, modeName?: string, startedAt?: number }>} */
    const byKey = new Map()

    const add = (hit) => {
      const text = String(hit.text || '').trim().slice(0, 1600)
      if (!text) return
      const key = text.slice(0, 120)
      const prev = byKey.get(key)
      if (!prev || hit.score > prev.score) byKey.set(key, { ...hit, text })
    }

    if (isEnabled()) {
      const vecHits = await recall(q, { topK: maxResults, timeoutMs: 1200 })
      for (const h of vecHits) add({ ...h, score: (h.score || 0) * 2.2 })
    }

    const index = loadIndex()
    const terms = tokenize(q)
    if (terms.length && index.chunks?.length) {
      for (const c of index.chunks) {
        const kw = keywordOverlapScore(q, c.text)
        if (kw <= 0) continue
        add({
          text: c.text,
          score: kw * 1.5,
          source: 'keyword_chunk',
          sessionId: c.sessionId,
          modeName: c.modeName,
          startedAt: c.startedAt,
        })
      }
    }

    const sessions = Array.isArray(opts.meetingSessions) ? opts.meetingSessions : []
    if (sessions.length && (store.get('globalMeetingSearchEnabled') === true || isEnabled())) {
      const { searchMeetingSessions } = require('./meetingRecall')
      const sessionHits = searchMeetingSessions(sessions, q, { maxResults: 4 })
      for (const s of sessionHits) {
        const text = String(s.summary || s.transcriptPreview || '').trim().slice(0, 1600)
        if (!text) continue
        add({
          text,
          score: keywordOverlapScore(q, text) * 1.8,
          source: 'meeting_session',
          sessionId: s.id,
          modeName: s.modeName,
          startedAt: s.startedAt,
        })
      }
    }

    return [...byKey.values()].sort((a, b) => b.score - a.score).slice(0, maxResults)
  }

  function clearAll() {
    saveIndex({ version: INDEX_VERSION, chunks: [] })
    return { ok: true }
  }

  function stats() {
    const index = loadIndex()
    const withEmb = (index.chunks || []).filter((c) => Array.isArray(c.embedding) && c.embedding.length).length
    return {
      enabled: isEnabled(),
      chunks: (index.chunks || []).length,
      embedded: withEmb,
    }
  }

  return {
    indexSession,
    migrateExistingSessions,
    recall,
    searchPastMeetings,
    removeSession,
    clearAll,
    stats,
    isEnabled,
  }
}

module.exports = { createVectorMemoryStore, INDEX_VERSION, MAX_CHUNKS }
