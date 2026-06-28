// Copyright (c) 2026 VeilAssist. All rights reserved.
// Mic-path speech validator when Whisper verbose_json metadata is unavailable.

/** Poetic / narrative fragments Whisper hallucinates on silence (not meeting speech). */
const POETIC_HALLUCINATION_RES = [
  /\bin the mouth of\b/i,
  /\bmouth of (her|him|them|the)\b/i,
  /\bof (her|him|them)\.?\s*$/,
  /\bthe land of\b/i,
  /\bshadow(s)? of (the|her|his|their)\b/i,
  /\bheart of (the|her|his|their)\b/i,
  /\bwhisper(s)? of\b/i,
  /\bvoice(s)? of (the|her|his|their)\b/i,
  /\bdepth(s)? of (the|her|his|their)\b/i,
]

/** Mic meeting speech must anchor to speaker/listener — Natively expects conversational STT. */
const MIC_SPEECH_ANCHOR_RE =
  /\b(i|i'm|im|i've|i'd|you|you're|you've|we|we're|us|our|your|my|me|can you|could you|are you|is it|am i|let's|let us|thank you|thanks|hello|hi|hey|okay|ok)\b/i

/**
 * @param {string} text
 * @returns {boolean}
 */
function passesMicMeetingSpeech(text) {
  const t = String(text || '').trim()
  if (t.length < 3) return false

  const lower = t.toLowerCase()

  if (POETIC_HALLUCINATION_RES.some((re) => re.test(t))) return false

  if (MIC_SPEECH_ANCHOR_RE.test(lower)) return true
  if (/\?\s*$/.test(t)) return true

  const words = lower.split(/\s+/).filter(Boolean)
  if (words.length >= 7 && /\b(is|are|was|were|have|has|do|did|will|would|can|could|should|uses|use|using)\b/.test(lower)) {
    return true
  }

  return false
}

/**
 * Sys loopback — more lenient (remote participants, no first-person required).
 * @param {string} text
 */
function passesSysMeetingSpeech(text) {
  const t = String(text || '').trim()
  if (t.length < 3) return false
  if (POETIC_HALLUCINATION_RES.some((re) => re.test(t))) return false
  return true
}

module.exports = {
  passesMicMeetingSpeech,
  passesSysMeetingSpeech,
  POETIC_HALLUCINATION_RES,
}
