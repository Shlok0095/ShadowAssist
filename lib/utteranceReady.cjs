// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phone-style utterance gate for hands-free auto-answer (fragment / mid-sentence block).

const { looksLikeSttGarbage } = require('./localStt/sttGarbageHeuristics.cjs')

const QUESTION_HINT =
  /\?|^(can|could|would|will|tell|what|how|why|who|when|where|describe|explain|walk me|do you|have you|are you|is there)\b/i

const REQUEST_HINT =
  /\b(please|provide|explain|describe|tell me|talk about|walk me through|architecture|experience|project|transformer|listen)\b/i

function isPlausibleInterviewUtterance(text) {
  if (looksLikeSttGarbage(text)) return false
  const t = String(text || '').trim()
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 3) return false

  const veryShort = words.filter((w) => w.replace(/[^a-zA-Z]/g, '').length <= 2).length
  if (veryShort > Math.ceil(words.length * 0.55)) return false

  if (QUESTION_HINT.test(t)) return true
  if (REQUEST_HINT.test(t)) return true
  return words.length >= 8
}

/** Stricter gate — only fire auto-answer after the speaker likely finished. */
function isUtteranceReadyForAutoAnswer(text) {
  if (!isPlausibleInterviewUtterance(text)) return false
  const t = String(text || '').trim()
  const words = t.split(/\s+/).filter(Boolean)
  if (/\?/.test(t) || QUESTION_HINT.test(t) || REQUEST_HINT.test(t)) {
    return words.length >= 3
  }
  if (t.length < 18 && words.length < 5) return false
  if (words.length < 5) return false
  return true
}

function estimatedAnswerReadbackHoldMs(answerText) {
  const words = String(answerText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.min(12000, Math.max(6000, 4000 + words * 220))
}

module.exports = {
  estimatedAnswerReadbackHoldMs,
  isPlausibleInterviewUtterance,
  isUtteranceReadyForAutoAnswer,
}
