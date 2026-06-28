// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively whisper/hallucinationFilter.ts + extra guards for finals.

const EXACT_BLOCKS = new Set([
  '[music]',
  '[applause]',
  '[inaudible]',
  '(music)',
  'thank you for watching',
  'thanks for watching',
  'you',
  'bye',
  '...',
  '.',
])

const BRACKET_TOKEN_RE = /^\[.*\]$/i

const { sanitizeTranscript } = require('./transcriptSanitizer')

/** Natively filterHallucination — used for streaming partials. */
function filterHallucination(text) {
  const trimmed = sanitizeTranscript(String(text || ''))
  if (trimmed.length < 2) return null
  const lower = trimmed.toLowerCase()
  if (EXACT_BLOCKS.has(lower)) return null
  if (BRACKET_TOKEN_RE.test(trimmed)) return null
  return trimmed
}

const HALLUCINATIONS = [
  /^thank(s| you)[\s\W]*$/i,
  /^thanks for (watching|listening)[\s\W]*$/i,
  /^(bye|goodbye|gracias|merci|ありがとう|谢谢)[\s\W]*$/i,
  /^(you|i|the|okay|ok|yeah|hmm+|uh+|um+)[\s.!?]*$/i,
  /^[\s.…,!?\-_]+$/i,
  /^\[[\w\s,]+\][\s.]*$/i,
  /^\(?music\)?$/i,
  /^\(?applause\)?$/i,
  /^\(?laughter\)?$/i,
  /\bblank[\s_]*audio\b/i,
  /^(subtitle|subtitles)\b/i,
  /^\.{2,}$/,
  /\bplease subscribe\b/i,
  /\blike and subscribe\b/i,
  /^(silence|inaudible)\b/i,
  /^\(?typing\)?$/i,
  /^watching in \d+p\b/i,
  /\bcastingwords\b/i,
  /\btranscription by\b/i,
  /\btranslation by\b/i,
  /transcribe only words that are spoken/i,
  /Дякую за перегляд/u,
  /\bamara\.org\b/i,
  /\bsubtitles? by\b/i,
  /^\.?\s*$/,
  /^\s*\.\s*$/,
  /^\s*,\s*$/,
  /^see you (next time|soon|later)[\s\W]*$/i,
  /^(thank you for your time|thank you for watching|thanks for watching)[\s\W]*$/i,
  /^(i don'?t know)[\s.!?]*$/i,
  // Short incomplete phrase fragments common on near-silent windows.
  /^(right|okay|so|well|um|uh|hmm)[\s.!?]*$/i,
  /^(how do you|what do you|going to|let me|i mean)[\s.…,!?]*$/i,
  /\bby\s+[A-Z][a-zA-Z]{2,}/,
  /\b(transcri|caption|subtitle|translation)\s+by\b/i,
  /\b\w+\s+tool\.?$/i,
  /\bdevory\b/i,
]

function isRepetitionHallucination(text) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
  if (words.length < 6) return false
  for (let n = 2; n <= 4; n++) {
    if (words.length < n * 3) continue
    const counts = {}
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words
        .slice(i, i + n)
        .join(' ')
        .toLowerCase()
      counts[gram] = (counts[gram] || 0) + 1
    }
    for (const cnt of Object.values(counts)) {
      if (cnt >= 3 && (cnt * n) / words.length > 0.6) return true
    }
  }
  return false
}

/** Finals: Natively light filter + repetition / phrase guards (keep short real words like "hi"). */
function filterTranscript(text) {
  const light = filterHallucination(text)
  if (!light) return null
  if (HALLUCINATIONS.some((r) => r.test(light))) return null
  if (isRepetitionHallucination(light)) return null
  return light
}

const filterPartialTranscript = filterHallucination

module.exports = {
  filterTranscript,
  filterHallucination,
  filterPartialTranscript,
  HALLUCINATIONS,
}
