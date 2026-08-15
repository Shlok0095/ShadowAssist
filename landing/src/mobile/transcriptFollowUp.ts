import { normalizeQuestion, pendingTranscriptText, type SpeechSegment } from './transcriptSegments'

/** Extract speech added after the answered snapshot (InterviewMan-style follow-up tail). */
export function extractFollowUpAfterAnswer(answered: string, current: string): string {
  const answeredText = String(answered || '').trim()
  const currentText = String(current || '').trim()
  if (!currentText) return ''
  if (!answeredText) return currentText
  if (currentText === answeredText) return ''

  if (currentText.startsWith(answeredText)) {
    return currentText.slice(answeredText.length).replace(/^[\s,.\-?!:;]+/, '').trim()
  }

  const answeredLower = answeredText.toLowerCase()
  const currentLower = currentText.toLowerCase()
  if (currentLower.startsWith(answeredLower)) {
    return currentText.slice(answeredText.length).replace(/^[\s,.\-?!:;]+/, '').trim()
  }

  const idx = currentLower.indexOf(answeredLower)
  if (idx >= 0) {
    const tail = currentText.slice(idx + answeredText.length).replace(/^[\s,.\-?!:;]+/, '').trim()
    if (tail) return tail
  }

  return ''
}

export function consumeAnsweredTranscript(answered: string, current: string): string {
  return extractFollowUpAfterAnswer(answered, current)
}

/** Pick the new question spoken after (or during) the last answered one. */
export function resolveFollowUpQuestion(
  answeredQuestion: string,
  segments: SpeechSegment[],
): string {
  const answered = String(answeredQuestion || '').trim()
  const pending = pendingTranscriptText(segments)
  if (!pending) return ''

  const trimmed = extractFollowUpAfterAnswer(answered, pending)
  const candidate = (trimmed || pending).trim()
  if (!candidate) return ''
  if (answered && normalizeQuestion(candidate) === normalizeQuestion(answered)) return ''
  return candidate
}
