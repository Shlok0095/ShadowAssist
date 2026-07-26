// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively transcriptCleaner.ts — deterministic clean/sparsify/format for Ask context.

const TRANSCRIPT_WINDOW_MS = 180_000

const FILLER_WORDS = new Set([
  'uh', 'um', 'ah', 'hmm', 'hm', 'er', 'erm',
  'like', 'you know', 'i mean', 'basically', 'actually',
  'so', 'well', 'anyway', 'anyways',
])

const ACKNOWLEDGEMENTS = new Set([
  'okay', 'ok', 'yeah', 'yes', 'right', 'sure', 'got it',
  'gotcha', 'uh-huh', 'uh huh', 'mm-hmm', 'mm hmm', 'mhm',
  'cool', 'great', 'nice', 'perfect', 'alright', 'all right',
])

const CONTENT_AMBIGUOUS = new Set([
  'right', 'like', 'well', 'so', 'sure', 'great', 'nice', 'perfect', 'cool',
  'all right', 'alright', 'yes', 'no',
])

function cleanText(text) {
  let result = String(text || '').toLowerCase().trim()
  result = result.replace(/\b(\w+)(\s+\1)+\b/gi, '$1')

  const words = result.split(/\s+/)
  const norm = (w) => w.replace(/[.,!?;:]/g, '')
  const isFiller = (w) => FILLER_WORDS.has(w) || ACKNOWLEDGEMENTS.has(w)

  let start = 0
  let end = words.length - 1
  while (start <= end && isFiller(norm(words[start]))) start += 1
  while (end >= start && isFiller(norm(words[end]))) end -= 1

  const cleaned = words.filter((word, i) => {
    const normalized = norm(word)
    if (!isFiller(normalized)) return true
    if (i > start && i < end) return CONTENT_AMBIGUOUS.has(normalized)
    return false
  })

  result = cleaned.join(' ').trim()
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([.,!?;:])+/g, '$1')
  result = result.replace(/\s+/g, ' ')
  return result
}

function isMeaningfulTurn(turn, cleanedText) {
  if (turn.role === 'interviewer' && cleanedText.length >= 5) return true
  const wordCount = cleanedText.split(/\s+/).filter((w) => w.length > 0).length
  if (wordCount < 3) return false
  if (cleanedText.length < 10) return false
  return true
}

function cleanTranscript(turns) {
  const cleaned = []
  for (const turn of turns) {
    const cleanedText = cleanText(turn.text)
    if (isMeaningfulTurn(turn, cleanedText)) {
      cleaned.push({ ...turn, text: cleanedText })
    }
  }
  return cleaned
}

function sparsifyTranscript(turns, maxTurns = 12) {
  if (turns.length <= maxTurns) {
    return [...turns].sort((a, b) => a.timestamp - b.timestamp)
  }

  const interviewerTurns = turns.filter((t) => t.role === 'interviewer')
  const otherTurns = turns.filter((t) => t.role !== 'interviewer')
  const recentInterviewer = interviewerTurns.slice(-6)
  const remainingSlots = maxTurns - recentInterviewer.length
  const recentOther = otherTurns.slice(-remainingSlots)
  const result = [...recentInterviewer, ...recentOther]
  result.sort((a, b) => a.timestamp - b.timestamp)
  return result
}

function formatTranscriptForLLM(turns) {
  return turns
    .map((turn) => {
      const label = turn.role === 'interviewer' ? 'INTERVIEWER' : turn.role === 'user' ? 'ME' : 'ASSISTANT'
      return `[${label}]: ${turn.text}`
    })
    .join('\n')
}

function prepareTranscriptForWhatToAnswer(turns, maxTurns = 12) {
  const cleaned = cleanTranscript(turns)
  const sparsified = sparsifyTranscript(cleaned, maxTurns)
  return formatTranscriptForLLM(sparsified)
}

function segmentToTurn(segment, now = Date.now()) {
  const speaker = segment?.speaker
  const role = speaker === 'other' || speaker === 'participant' ? 'interviewer' : 'user'
  return {
    role,
    text: String(segment?.text || ''),
    timestamp: Number(segment?.capturedAt || segment?.updatedAt || now),
  }
}

function segmentsWithinWindow(segments, now = Date.now(), windowMs = TRANSCRIPT_WINDOW_MS) {
  return (Array.isArray(segments) ? segments : [])
    .filter((segment) => segment && !segment.interim)
    .filter((segment) => String(segment.text || '').trim())
    .filter((segment) => now - Number(segment.capturedAt || segment.updatedAt || now) <= windowMs)
}

function buildPreparedTranscriptContext(segments, { maxTurns = 12, now = Date.now() } = {}) {
  const turns = segmentsWithinWindow(segments, now).map((segment) => segmentToTurn(segment, now))
  if (!turns.length) return ''
  return prepareTranscriptForWhatToAnswer(turns, maxTurns)
}

module.exports = {
  TRANSCRIPT_WINDOW_MS,
  cleanText,
  cleanTranscript,
  sparsifyTranscript,
  formatTranscriptForLLM,
  prepareTranscriptForWhatToAnswer,
  buildPreparedTranscriptContext,
  segmentsWithinWindow,
  segmentToTurn,
}
