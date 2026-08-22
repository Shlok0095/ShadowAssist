/** Reject Whisper/ASR junk — prompt echo, primers, UI status leaks, and repetition loops. */

const PROMPT_ECHO = [
  'question about experience and skills',
  'english interview speech with international accents',
  'english and hindi mixed interview speech',
  'ठीक है, तो इस सवाल का जवाब देते हैं',
]

const UI_STATUS_ECHO =
  /\b(generating answer|generating|generation|composing|listening|transcribing|transcription|starting|reconnecting)\b/i

const HALLUCINATION_PATTERNS = [
  /^thank(s| you)[\s\W]*$/i,
  /^thanks for (watching|listening)[\s\W]*$/i,
  /^(bye|goodbye|okay|ok|yeah|hmm+|uh+|um+)[\s.!?]*$/i,
  /^[\s.…,!?\-_]+$/i,
  /^\(?music\)?$/i,
  /^\(?applause\)?$/i,
  /^(silence|inaudible)\b/i,
  /^(subtitle|subtitles)\b/i,
  /\bplease subscribe\b/i,
  /\btranscription by\b/i,
  /transcribe only words that are spoken/i,
]

export function isRepetitionHallucination(text: string): boolean {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length < 6) return false
  for (let n = 2; n <= 4; n += 1) {
    if (words.length < n * 3) continue
    const counts: Record<string, number> = {}
    for (let i = 0; i <= words.length - n; i += 1) {
      const gram = words
        .slice(i, i + n)
        .join(' ')
        .toLowerCase()
      counts[gram] = (counts[gram] || 0) + 1
    }
    for (const cnt of Object.values(counts)) {
      if (cnt >= 3 && (cnt * n) / words.length > 0.55) return true
    }
  }
  return false
}

export function isLikelySttGarbage(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length < 2) return true

  const lower = t.toLowerCase().replace(/\s+/g, ' ')

  for (const primer of PROMPT_ECHO) {
    const p = primer.toLowerCase()
    if (lower === p || lower.startsWith(`${p}.`) || lower.startsWith(`${p},`)) return true
    if (lower.length <= p.length + 12 && lower.includes(p)) return true
  }

  if (HALLUCINATION_PATTERNS.some((re) => re.test(t))) return true
  if (UI_STATUS_ECHO.test(lower) && lower.split(/\s+/).length <= 4) return true
  if (/^(listening|generating|generation|composing)\.?$/i.test(t)) return true
  if (isRepetitionHallucination(t)) return true

  return false
}

/** Drop near-duplicate finals from Android Web Speech rapid restarts. */
export function isDuplicateDeviceFinal(previous: string, incoming: string): boolean {
  const prev = String(previous || '').trim()
  const inc = String(incoming || '').trim()
  if (!inc) return true
  if (!prev) return false
  if (inc === prev) return true
  if (prev.startsWith(inc) && inc.length <= prev.length) return true
  if (inc.startsWith(prev) && prev.length >= inc.length * 0.9) return false
  return false
}

const QUESTION_HINT =
  /\?|^(can|could|would|will|tell|what|how|why|who|when|where|describe|explain|walk me|do you|have you|are you|is there)\b/i

const REQUEST_HINT =
  /\b(please|provide|explain|describe|tell me|talk about|walk me through|architecture|experience|project|transformer|listen)\b/i

/** Gate auto-answer — reject garbage partial STT and non-questions. */
export function isPlausibleInterviewUtterance(text: string): boolean {
  if (isLikelySttGarbage(text)) return false
  const t = String(text || '').trim()
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 3) return false

  const veryShort = words.filter((w) => w.replace(/[^a-zA-Z]/g, '').length <= 2).length
  if (veryShort > Math.ceil(words.length * 0.55)) return false

  if (QUESTION_HINT.test(t)) return true
  if (REQUEST_HINT.test(t)) return true
  return words.length >= 8
}

/**
 * Stricter gate for hands-free auto-answer — only after the speaker has likely finished.
 * Blocks mid-sentence fragments like "marks with SAP" while the user is still talking.
 */
export function isUtteranceReadyForAutoAnswer(text: string): boolean {
  if (!isPlausibleInterviewUtterance(text)) return false
  const t = String(text || '').trim()
  const words = t.split(/\s+/).filter(Boolean)
  if (t.length < 18 && words.length < 5) return false
  if (words.length < 5 && !/\?/.test(t) && !QUESTION_HINT.test(t) && !REQUEST_HINT.test(t)) {
    return false
  }
  return true
}
