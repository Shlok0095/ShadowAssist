/** Reject Whisper/ASR junk — prompt echo, primers, and near-silent hallucinations. */
const PROMPT_ECHO = [
  'question about experience and skills',
  'english interview speech with international accents',
  'english and hindi mixed interview speech',
  'ठीक है, तो इस सवाल का जवाब देते हैं',
]

export function isLikelySttGarbage(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length < 2) return true

  const lower = t.toLowerCase().replace(/\s+/g, ' ')

  for (const primer of PROMPT_ECHO) {
    const p = primer.toLowerCase()
    if (lower === p || lower.startsWith(`${p}.`) || lower.startsWith(`${p},`)) return true
    if (lower.length <= p.length + 12 && lower.includes(p)) return true
  }

  if (/^listening\.?$/i.test(t)) return true
  if (/\blistening\b/i.test(lower)) return true

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
