// Copyright (c) 2026 VeilAssist. All rights reserved.
// Deterministic latest-meaningful-question selection for the live answer path.

const GREETING_OR_ACK_RE =
  /^(hi|hello|hey|thanks?|thank you|okay|ok|yes|yeah|yep|no|nope|sure|right|correct|great|nice|fine|good|come|continue|go ahead|sounds good|got it|all right)[\s!.,?]*$/i
const QUESTION_LEAD_RE =
  /^(what|who|why|where|when|which|how|can|could|would|will|do|did|does|are|is|were|was|have|has|had|explain|describe|define|compare|tell me|walk me|show me|give me|help me)\b/i

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function isMeaningfulTurn(text) {
  const clean = cleanText(text)
  if (!clean || !/[a-z0-9]/i.test(clean)) return false
  if (GREETING_OR_ACK_RE.test(clean)) return false
  const words = clean.match(/[a-z0-9][\w'-]*/gi) || []
  if (words.length < 2 && clean.length < 12) return false
  return true
}

function isQuestionLike(text) {
  const clean = cleanText(text)
  return /\?/.test(clean) || QUESTION_LEAD_RE.test(clean)
}

function selectLatestMeaningfulTurn(segments) {
  const list = (Array.isArray(segments) ? segments : [])
    .map((segment, index) => ({
      ...segment,
      text: cleanText(segment?.text),
      _index: index,
    }))
    .filter((segment) => segment.text)

  for (let index = list.length - 1; index >= 0; index -= 1) {
    const segment = list[index]
    if (isMeaningfulTurn(segment.text)) {
      return { active: segment, activeIndex: segment._index }
    }
  }

  return { active: null, activeIndex: -1 }
}

function extractStructuredActiveQuestion(structuredPrompt) {
  const text = String(structuredPrompt || '')
  const match = text.match(/## ACTIVE QUESTION[^\n]*\n([\s\S]*?)(?=\n## |\s*$)/i)
  if (!match?.[1]) return ''
  return match[1]
    .replace(/^(?:Me|Participant|You|Interviewer|Speaker)\s*:\s*/i, '')
    .trim()
}

function formatSegmentsForPrompt(segments, {
  maxSegments = 12,
  speakerLabel = (speaker) => (speaker === 'other' ? 'Participant' : 'Me'),
} = {}) {
  const list = Array.isArray(segments) ? segments : []
  const { active, activeIndex } = selectLatestMeaningfulTurn(list)
  if (!active) return ''

  const activeLine = `${speakerLabel(active.speaker)}: ${active.text}`
  const contextLines = list
    .map((segment, index) => ({ segment, index }))
    .filter(({ index, segment }) => index !== activeIndex && isMeaningfulTurn(segment?.text))
    .slice(-Math.max(0, maxSegments - 1))
    .map(({ segment }) => `${speakerLabel(segment.speaker)}: ${cleanText(segment.text)}`)

  return [
    `## ACTIVE QUESTION (answer this)\n${activeLine}`,
    contextLines.length
      ? `## RECENT CONTEXT (only if it clarifies the active question)\n${contextLines.join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

module.exports = {
  isMeaningfulTurn,
  isQuestionLike,
  selectLatestMeaningfulTurn,
  extractStructuredActiveQuestion,
  formatSegmentsForPrompt,
}
