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

  return false
}
