// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 6 — chunking + similarity helpers for vector memory.

const { tokenize } = require('./meetingRecall')

const CHUNK_CHARS = 2000
const CHUNK_OVERLAP_CHARS = 200
const MIN_CHUNK_CHARS = 48
const TARGET_TOKENS = 300
const MAX_TOKENS = 400
const MIN_TOKENS = 100
const OVERLAP_TARGET_TOKENS = 50

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4))
}

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

function sessionSegments(session) {
  const segments = []
  const summary = String(session?.summary || '').trim()
  if (summary) segments.push({ speaker: 'Summary', text: summary, at: Number(session?.startedAt) || 0 })
  for (const line of Array.isArray(session?.transcriptLines) ? session.transcriptLines : []) {
    const raw = String(line?.text || '').trim()
    if (!raw) continue
    const match = raw.match(/^([^:\n]{1,40}):\s*([\s\S]+)$/)
    segments.push({
      speaker: match?.[1]?.trim() || 'Transcript',
      text: match?.[2]?.trim() || raw,
      at: Number(line?.at) || 0,
    })
  }
  for (const exchange of Array.isArray(session?.exchanges) ? session.exchanges : []) {
    const at = Number(exchange?.at) || 0
    const question = String(exchange?.question || '').trim()
    const answer = String(exchange?.answer || '').trim()
    if (question) segments.push({ speaker: 'Question', text: question, at })
    if (answer) segments.push({ speaker: 'Assistant', text: answer, at: at + 1 })
  }
  return segments
}

function calculateOverlap(segments) {
  let tokens = 0
  let count = 0
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segmentTokens = estimateTokens(segments[i].text)
    if (segmentTokens > OVERLAP_TARGET_TOKENS && count === 0) {
      const overlapText = String(segments[i].text).slice(-(OVERLAP_TARGET_TOKENS * 4))
      return {
        segments: [{ ...segments[i], text: overlapText }],
        tokens: estimateTokens(overlapText),
      }
    }
    if (tokens + segmentTokens > OVERLAP_TARGET_TOKENS && count > 0) break
    tokens += segmentTokens
    count += 1
    if (count >= 2) break
  }
  return {
    segments: segments.slice(segments.length - count),
    tokens,
  }
}

function splitOversizedSegment(segment) {
  if (estimateTokens(segment.text) <= MAX_TOKENS) return [segment]
  const text = String(segment.text || '')
  const targetChars = TARGET_TOKENS * 4
  const maxChars = MAX_TOKENS * 4
  const overlapChars = OVERLAP_TARGET_TOKENS * 4
  const pieces = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(text.length, start + targetChars)
    if (end < text.length) {
      const boundary = Math.max(
        text.lastIndexOf('\n', Math.min(text.length, start + maxChars)),
        text.lastIndexOf(' ', Math.min(text.length, start + maxChars)),
      )
      if (boundary > start + Math.floor(targetChars * 0.65)) end = boundary
    }
    const piece = text.slice(start, Math.min(end, start + maxChars)).trim()
    if (piece) pieces.push({ ...segment, text: piece })
    if (end >= text.length) break
    start = Math.max(start + 1, end - overlapChars)
  }
  return pieces
}

function chunkSession(session) {
  const segments = sessionSegments(session).flatMap(splitOversizedSegment)
  if (!segments.length) return []
  const chunks = []
  let current = []
  let currentTokens = 0

  function flush() {
    if (!current.length) return
    chunks.push({
      speaker: current[0].speaker,
      startedAt: current[0].at || Number(session?.startedAt) || Date.now(),
      text: current.map((segment) => `${segment.speaker}: ${segment.text}`).join('\n'),
      tokenCount: currentTokens,
    })
  }

  for (const segment of segments) {
    const segmentTokens = estimateTokens(segment.text)
    const speakerChanged = current.length > 0 && segment.speaker !== current[0].speaker
    const exceedsMax = currentTokens + segmentTokens > MAX_TOKENS
    if (exceedsMax && currentTokens < MIN_TOKENS) {
      current = []
      currentTokens = 0
    }
    if ((speakerChanged || exceedsMax || currentTokens >= TARGET_TOKENS) && current.length) {
      const prior = current
      flush()
      if (!speakerChanged) {
        const overlap = calculateOverlap(prior)
        if (overlap.tokens + segmentTokens <= MAX_TOKENS) {
          current = [...overlap.segments]
          currentTokens = overlap.tokens
        } else {
          current = []
          currentTokens = 0
        }
      } else {
        current = []
        currentTokens = 0
      }
    }
    current.push(segment)
    currentTokens += segmentTokens
  }
  flush()
  return chunks
}

module.exports = {
  CHUNK_CHARS,
  CHUNK_OVERLAP_CHARS,
  chunkText,
  cosineSimilarity,
  keywordOverlapScore,
  buildSessionIndexText,
  chunkSession,
  estimateTokens,
  TARGET_TOKENS,
  MAX_TOKENS,
  MIN_TOKENS,
  OVERLAP_TARGET_TOKENS,
  splitOversizedSegment,
}
