/**
 * InterviewMan-style speech segments — track discrete utterances, active question,
 * and consumed watermark so we never re-answer the same text or send the full buffer blob.
 */

export type SpeechSegment = {
  id: number
  text: string
  consumed: boolean
  capturedAt: number
}

let segmentId = 0

export function normalizeQuestion(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function questionsAreSimilar(a: string, b: string): boolean {
  const na = normalizeQuestion(a)
  const nb = normalizeQuestion(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length > nb.length ? na : nb
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.78) return true
  const aWords = new Set(na.split(' ').filter((w) => w.length > 2))
  const bWords = nb.split(' ').filter((w) => w.length > 2)
  if (!aWords.size || !bWords.length) return false
  let overlap = 0
  for (const w of bWords) {
    if (aWords.has(w)) overlap += 1
  }
  return overlap / Math.max(aWords.size, bWords.length) >= 0.85
}

export function pendingTranscriptText(segments: SpeechSegment[]): string {
  return segments
    .filter((s) => !s.consumed)
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

/** Full rolling log for the live transcription panel (InterviewMan-style — never clears on answer). */
export function fullTranscriptText(segments: SpeechSegment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

/** Last N seconds of heard speech — InterviewMan conversation memory. */
export function transcriptInWindow(
  segments: SpeechSegment[],
  memorySec: number,
  now = Date.now(),
): string {
  const cutoff = now - Math.max(30, memorySec) * 1000
  const text = segments
    .filter((s) => s.capturedAt >= cutoff)
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
  if (text.length <= 4000) return text
  return text.slice(-4000).trim()
}

export function selectActiveQuestion(segments: SpeechSegment[]): string {
  const pending = segments.filter((s) => !s.consumed && s.text.trim())
  if (!pending.length) return ''
  return pending[pending.length - 1].text.trim()
}

export function appendSpeechSegment(segments: SpeechSegment[], text: string): SpeechSegment[] {
  const piece = String(text || '').trim()
  if (!piece) return segments

  const last = segments[segments.length - 1]
  if (last && !last.consumed) {
    if (questionsAreSimilar(last.text, piece)) {
      if (piece.length > last.text.length) {
        return [...segments.slice(0, -1), { ...last, text: piece, capturedAt: Date.now() }]
      }
      return segments
    }
    if (piece.startsWith(last.text) || last.text.startsWith(piece)) {
      const longer = piece.length >= last.text.length ? piece : last.text
      return [...segments.slice(0, -1), { ...last, text: longer, capturedAt: Date.now() }]
    }
  }

  segmentId += 1
  return [
    ...segments,
    { id: segmentId, text: piece, consumed: false, capturedAt: Date.now() },
  ]
}

/** Mark segments consumed through the question we just answered. */
export function consumeSegmentsForQuestion(
  segments: SpeechSegment[],
  answeredQuestion: string,
): SpeechSegment[] {
  const q = normalizeQuestion(answeredQuestion)
  if (!q) return segments

  let matchedIndex = -1
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i]
    if (seg.consumed) continue
    if (questionsAreSimilar(seg.text, answeredQuestion)) {
      matchedIndex = i
      break
    }
  }

  if (matchedIndex < 0) {
    return segments.map((s) => (s.consumed ? s : { ...s, consumed: true }))
  }

  return segments.map((s, i) => (i <= matchedIndex ? { ...s, consumed: true } : s))
}

export function extractFollowUpTail(
  segments: SpeechSegment[],
  answeredQuestion: string,
): string {
  const afterConsume = consumeSegmentsForQuestion(segments, answeredQuestion)
  return selectActiveQuestion(afterConsume) || pendingTranscriptText(afterConsume)
}
