// Copyright (c) 2026 VeilAssist. All rights reserved.
// Parity with landing/src/mobile/transcriptSegments.ts — ignore mic text overlapping a generated answer.

function normalizeForCompare(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenOverlapRatio(candidate, reference) {
  const candTokens = normalizeForCompare(candidate)
    .split(' ')
    .filter((t) => t.length > 2)
  const refTokens = new Set(
    normalizeForCompare(reference)
      .split(' ')
      .filter((t) => t.length > 2),
  )
  if (!candTokens.length || !refTokens.size) return 0
  const matched = candTokens.filter((t) => refTokens.has(t)).length
  return matched / candTokens.length
}

const READBACK_OVERLAP = 0.6

function isLikelySelfReadback(candidateText, lastAnswer) {
  const last = String(lastAnswer || '').trim()
  const cand = String(candidateText || '').trim()
  if (!last || cand.length < 15) return false
  return tokenOverlapRatio(cand, last) > READBACK_OVERLAP
}

function splitUtteranceSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function stripSelfReadback(candidateText, lastAnswer) {
  const cand = String(candidateText || '').trim()
  const last = String(lastAnswer || '').trim()
  if (!last || cand.length < 15) return cand
  if (tokenOverlapRatio(cand, last) <= READBACK_OVERLAP) return cand
  const sentences = splitUtteranceSentences(cand)
  if (sentences.length <= 1) return ''
  return sentences
    .filter((s) => tokenOverlapRatio(s, last) <= READBACK_OVERLAP)
    .join(' ')
    .trim()
}

module.exports = {
  tokenOverlapRatio,
  isLikelySelfReadback,
  stripSelfReadback,
  READBACK_OVERLAP,
}
