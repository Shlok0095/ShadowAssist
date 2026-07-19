// Copyright (c) 2026 VeilAssist. All rights reserved.
// Bag-of-Hallucinations — common Whisper outputs on silence/noise (research + OpenAI forums).

const EXACT_PHRASES = new Set([
  'thank you for watching',
  'thanks for watching',
  'thanks for listening',
  'thank you for listening',
  'please subscribe',
  'like and subscribe',
  'see you next time',
  'subtitles by the amara.org community',
  'subtitles by amara.org',
  'transcribe only words that are spoken',
  'bye',
  'you',
])

/** Substrings — case-insensitive match anywhere in text. */
const SUBSTRING_PATTERNS = [
  /amara\.org/i,
  /subtitles?\s+by/i,
  /transcription\s+by/i,
  /translation\s+by/i,
  /castingwords/i,
  /please subscribe/i,
  /thanks for watching/i,
  /thank you for watching/i,
  /upbeat music/i,
  /\bmusic\s*\)/i,
  /sample mail/i,
  /broken wheel/i,
  /in the mouth of/i,
  /devory/i,
  /\bmrr\b/i,
  /^bye,?\s*can we/i,
]

/** @param {string} text */
function matchesBagOfHallucinations(text) {
  const t = String(text || '').trim()
  if (!t) return true
  const lower = t.toLowerCase().replace(/\s+/g, ' ').trim()
  if (EXACT_PHRASES.has(lower)) return true
  return SUBSTRING_PATTERNS.some((re) => re.test(t))
}

module.exports = { matchesBagOfHallucinations, EXACT_PHRASES, SUBSTRING_PATTERNS }
