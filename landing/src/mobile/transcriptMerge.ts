/**
 * Android/iOS Web Speech API often emits cumulative finals:
 * "hey" → "hey are" → "hey are you". Appending each chunk causes rolling duplicates.
 */
export function mergeCumulativeFinal(previous: string, incoming: string): string {
  const inc = String(incoming || '').trim()
  if (!inc) return String(previous || '').trim()
  const prev = String(previous || '').trim()
  if (!prev) return inc
  if (inc === prev) return prev
  if (inc.startsWith(prev)) return inc
  if (prev.startsWith(inc)) return prev
  if (prev.endsWith(inc)) return prev

  const prevLower = prev.toLowerCase()
  const incLower = inc.toLowerCase()
  if (prevLower.endsWith(incLower)) return prev
  if (prevLower.includes(incLower) && inc.length < prev.length * 0.85) return prev

  const maxOverlap = Math.min(prev.length, inc.length, 96)
  for (let len = maxOverlap; len >= 4; len -= 1) {
    if (prevLower.slice(-len) === incLower.slice(0, len)) {
      return `${prev}${inc.slice(len)}`.trim()
    }
  }

  return `${prev} ${inc}`.trim()
}

/** Hard cap — runaway STT loops cannot fill the UI. */
export function capTranscriptLength(text: string, max = 4800): string {
  const t = String(text || '').trim()
  if (t.length <= max) return t
  return t.slice(-max).trim()
}
