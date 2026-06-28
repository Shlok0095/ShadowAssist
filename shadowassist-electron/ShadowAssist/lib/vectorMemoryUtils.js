// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 6 — chunking + similarity helpers for vector memory.

const { tokenize } = require('./meetingRecall')

const CHUNK_CHARS = 2000
const CHUNK_OVERLAP_CHARS = 200
const MIN_CHUNK_CHARS = 48

/**
 * @param {string} text
 * @param {{ size?: number, overlap?: number }} [opts]
 */
function chunkText(text, opts = {}) {
  const size = Math.max(400, opts.size || CHUNK_CHARS)
  const overlap = Math.max(0, Math.min(size - 100, opts.overlap || CHUNK_OVERLAP_CHARS))
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.length <= size) return [raw]

  const chunks = []
  let start = 0
  while (start < raw.length) {
    const piece = raw.slice(start, start + size).trim()
    if (piece.length >= MIN_CHUNK_CHARS) chunks.push(piece)
    if (start + size >= raw.length) break
    start += size - overlap
  }
  return chunks
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}

/**
 * Keyword overlap score when embeddings unavailable.
 * @param {string} query
 * @param {string} text
 */
function keywordOverlapScore(query, text) {
  const terms = tokenize(query)
  if (!terms.length) return 0
  const blob = String(text || '').toLowerCase()
  let score = 0
  for (const t of terms) {
    if (blob.includes(t)) score += 1
  }
  return score / terms.length
}

/**
 * @param {object} session Saved meeting session record
 */
function buildSessionIndexText(session) {
  const parts = []
  const summary = String(session?.summary || '').trim()
  if (summary) parts.push(summary)
  const lines = Array.isArray(session?.transcriptLines) ? session.transcriptLines : []
  if (lines.length) {
    parts.push(lines.map((l) => String(l.text || '').trim()).filter(Boolean).join('\n'))
  } else if (session?.transcriptPreview) {
    parts.push(String(session.transcriptPreview).trim())
  }
  return parts.filter(Boolean).join('\n\n')
}

module.exports = {
  CHUNK_CHARS,
  CHUNK_OVERLAP_CHARS,
  chunkText,
  cosineSimilarity,
  keywordOverlapScore,
  buildSessionIndexText,
}
