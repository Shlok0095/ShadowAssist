// Copyright (c) 2026 VeilAssist. All rights reserved.
// Local long-term memory — Natively LongTermMemoryService / Hindsight subset (no external API).

const { tokenize } = require('./meetingRecall')

const MAX_ENTRIES = 200
const MAX_CONTENT_CHARS = 6000
const RECALL_TIMEOUT_MS = 800

/**
 * @param {{ get: Function, set: Function }} store
 */
function createLongTermMemoryStore(store) {
  function list() {
    const raw = store.get('longTermMemory')
    return Array.isArray(raw) ? raw : []
  }

  /**
   * @param {{ content: string, source?: string, mode?: string, meetingId?: string, tags?: string[] }} item
   */
  function retain(item) {
    if (store.get('longTermMemoryEnabled') === false) return null
    const text = String(item?.content || '').trim().slice(0, MAX_CONTENT_CHARS)
    if (!text) return null
    const entries = list()
    const record = {
      id: `ltm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: text,
      source: String(item?.source || 'meeting_summary').slice(0, 64),
      mode: String(item?.mode || '').slice(0, 64),
      meetingId: String(item?.meetingId || '').slice(0, 64),
      tags: Array.isArray(item?.tags) ? item.tags.map((t) => String(t).slice(0, 48)).slice(0, 8) : [],
      createdAt: Date.now(),
    }
    entries.unshift(record)
    while (entries.length > MAX_ENTRIES) entries.pop()
    store.set('longTermMemory', [...entries])
    return record
  }

  /**
   * @param {string} query
   * @param {{ maxResults?: number, timeoutMs?: number }} [opts]
   * @returns {Promise<Array<{ id: string, text: string, source?: string, score: number }>>}
   */
  async function recall(query, opts = {}) {
    const maxResults = Math.max(1, Math.min(8, opts.maxResults || 5))
    const timeoutMs = Math.min(2000, Math.max(100, opts.timeoutMs || RECALL_TIMEOUT_MS))

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve([]), timeoutMs)
      try {
        if (store.get('longTermMemoryEnabled') === false) {
          clearTimeout(timer)
          resolve([])
          return
        }
        const terms = tokenize(query)
        const entries = list()
        if (!terms.length || !entries.length) {
          clearTimeout(timer)
          resolve([])
          return
        }
        const scored = []
        for (const e of entries) {
          const blob = `${e.content}\n${(e.tags || []).join(' ')}\n${e.mode || ''}`.toLowerCase()
          let score = 0
          for (const t of terms) {
            if (blob.includes(t)) score += 1
          }
          if (score <= 0) continue
          scored.push({
            id: e.id,
            text: String(e.content || '').trim().slice(0, 2000),
            source: e.source,
            score,
            createdAt: e.createdAt || 0,
          })
        }
        scored.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
        clearTimeout(timer)
        resolve(scored.slice(0, maxResults))
      } catch {
        clearTimeout(timer)
        resolve([])
      }
    })
  }

  /**
   * @param {Awaited<ReturnType<recall>>} matches
   */
  function formatRecallBlock(matches) {
    if (!Array.isArray(matches) || !matches.length) return ''
    const parts = matches.map((m, i) => {
      const tag = m.source ? ` (${m.source})` : ''
      return `- Memory ${i + 1}${tag}: ${m.text}`
    })
    return `\n\n---\n## LONG-TERM MEMORY (recall — facts only, do not invent)\n${parts.join('\n')}`
  }

  function clearAll() {
    const removed = list().length
    store.set('longTermMemory', [])
    return { ok: true, removed }
  }

  return { list, retain, recall, formatRecallBlock, clearAll }
}

module.exports = {
  createLongTermMemoryStore,
  MAX_ENTRIES,
  RECALL_TIMEOUT_MS,
}
