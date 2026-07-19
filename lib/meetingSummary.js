// Copyright (c) 2026 ShadowAssist. All rights reserved.
// End-of-session notes — Natively MeetingSummaryV3 subset (chunk → merge, structured sections).

const { MEETING_SUMMARY_FORMAT_RULES, normalizeMeetingSummaryMarkdown } = require('./meetingSummaryFormat')
const providers = require('./providers')
const { modeTemplateFromPrompt } = require('./answerPlanner')

const SINGLE_PASS_CHAR_LIMIT = 14000
const CHUNK_TRANSCRIPT_CHARS = 5200
const CHUNK_OVERLAP_LINES = 2
const MAX_TRANSCRIPT_FOR_LLM = 48000
const MAX_QA_FOR_LLM = 12000

const ACTION_RE =
  /\b(need to|needs to|will follow up|follow up|should|action item|next step|deadline|assigned to|assign to|todo|by (monday|tuesday|wednesday|thursday|friday|eod|end of day))\b/i
const DECISION_RE =
  /\b(decided|agreed|approved|committed|we('ll| will)|going with|chose to|decision is|signed off)\b/i
const QUESTION_RE = /\?\s*$|^(what|why|how|when|who|where|can we|should we|do we)\b/i

const DEFAULT_SECTIONS = [
  'Overview',
  'Key points',
  'Decisions',
  'Action items',
  'Open questions',
  'Notable Q&A',
]

const MODE_EXTRA_SECTIONS = {
  sales: ['Objections & responses', 'Next steps'],
  recruiting: ['Candidate signals', 'Interview questions'],
  'team-meet': ['Blockers', 'Follow-ups'],
  lecture: ['Concepts covered', 'Assignments mentioned'],
  'technical-interview': ['Technical topics', 'Follow-up study'],
  'looking-for-work': ['Role fit signals', 'Stories to refine'],
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 */
function sessionDurationMinutes(snapshot) {
  return Math.max(1, Math.round(((snapshot.endedAt || Date.now()) - snapshot.startedAt) / 60000))
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 */
function resolveSectionHeadings(snapshot) {
  const fromMode = (snapshot.notesSectionTitles || []).map((t) => String(t).trim()).filter(Boolean)
  const modeKey = modeTemplateFromPrompt({ name: snapshot.modeName })
  const extras = MODE_EXTRA_SECTIONS[modeKey] || []
  const merged = [...fromMode]
  for (const s of [...DEFAULT_SECTIONS, ...extras]) {
    if (!merged.some((x) => x.toLowerCase() === s.toLowerCase())) merged.push(s)
  }
  return merged.slice(0, 14)
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot['transcriptLines']} lines
 */
function chunkTranscriptLines(lines) {
  if (!lines?.length) return []
  const chunks = []
  let current = []
  let size = 0

  for (const line of lines) {
    const len = String(line.text || '').length + 1
    if (size + len > CHUNK_TRANSCRIPT_CHARS && current.length) {
      chunks.push(current)
      current = current.slice(-CHUNK_OVERLAP_LINES)
      size = current.reduce((sum, l) => sum + String(l.text || '').length + 1, 0)
    }
    current.push(line)
    size += len
  }
  if (current.length) chunks.push(current)
  return chunks
}

function formatTranscriptBlock(lines) {
  return (lines || []).map((l) => l.text).join('\n')
}

function formatQaBlock(exchanges) {
  return (exchanges || [])
    .map((e) => `Q: ${e.question}\nA: ${String(e.answer || '').slice(0, 1200)}`)
    .join('\n\n')
}

function estimateMaterialSize(snapshot) {
  const transcript = formatTranscriptBlock(snapshot.transcriptLines)
  const qa = formatQaBlock(snapshot.exchanges)
  return transcript.length + qa.length
}

function scanLinesForPatterns(lines, re, max = 8) {
  const hits = []
  for (const row of lines || []) {
    const t = String(row.text || '').trim()
    if (!t || !re.test(t)) continue
    hits.push(t.slice(0, 220))
    if (hits.length >= max) break
  }
  return hits
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 */
function buildFallbackSummary(snapshot) {
  const lines = []
  const durMin = sessionDurationMinutes(snapshot)
  const headings = resolveSectionHeadings(snapshot)

  lines.push('## Overview')
  lines.push(
    `- **${snapshot.modeName}** · ~${durMin} min · ${snapshot.transcriptLines.length} transcript lines · ${snapshot.exchanges.length} assistant asks`,
  )

  const topics = []
  for (const row of snapshot.transcriptLines.slice(-25)) {
    const t = String(row.text || '').trim()
    if (t.length > 24 && !topics.includes(t)) topics.push(t.slice(0, 160))
    if (topics.length >= 6) break
  }
  if (topics.length) {
    lines.push('')
    lines.push('## Key points')
    for (const t of topics) lines.push(`- ${t}`)
  }

  const decisions = scanLinesForPatterns(snapshot.transcriptLines, DECISION_RE, 6)
  if (decisions.length) {
    lines.push('')
    lines.push('## Decisions')
    for (const d of decisions) lines.push(`- ${d}`)
  }

  const actions = scanLinesForPatterns(snapshot.transcriptLines, ACTION_RE, 8)
  if (actions.length) {
    lines.push('')
    lines.push('## Action items')
    for (const a of actions) lines.push(`- ${a}`)
  }

  const openQs = scanLinesForPatterns(snapshot.transcriptLines, QUESTION_RE, 6)
  if (openQs.length) {
    lines.push('')
    lines.push('## Open questions')
    for (const q of openQs) lines.push(`- ${q}`)
  }

  if (snapshot.transcriptLines.length) {
    lines.push('')
    lines.push('## Transcript highlights')
    for (const row of snapshot.transcriptLines.slice(-12)) {
      lines.push(`- ${row.text.slice(0, 220)}`)
    }
  }

  if (snapshot.exchanges.length) {
    lines.push('')
    lines.push('## Notable Q&A')
    for (const ex of snapshot.exchanges.slice(-5)) {
      const firstAnswerLine = ex.answer.split('\n').find((l) => l.trim()) || ex.answer
      lines.push(`- **Q:** ${ex.question.slice(0, 140)}`)
      lines.push(`  ${firstAnswerLine.slice(0, 200)}`)
    }
  }

  for (const h of headings) {
    const key = h.toLowerCase()
    if (lines.some((l) => l.toLowerCase() === `## ${key}`)) continue
    // Custom mode sections left empty in fallback when no signal
  }

  if (snapshot.transcriptLines.length === 0 && snapshot.exchanges.length === 0) {
    lines.push('')
    lines.push('_No transcript or asks were captured in this session._')
  }

  return lines.join('\n')
}

function formatSectionsHint(headings) {
  const list = headings.map((t) => `## ${t}`).join(', ')
  return `Use these section headings where content exists: ${list}. Omit sections with no supporting facts entirely.`
}

function buildSystemPrompt(headings, { partial = false } = {}) {
  const sectionsHint = formatSectionsHint(headings)
  if (partial) {
    return `Extract factual notes from ONE transcript segment of a live meeting.
${MEETING_SUMMARY_FORMAT_RULES}
Segment rules:
- Bullets only for this segment (topics, decisions, actions, questions).
- Max 220 words. No preamble.`
  }
  return `You produce structured post-meeting recaps from a live session transcript and assistant Q&A log.
${MEETING_SUMMARY_FORMAT_RULES}
Additional rules:
- ${sectionsHint}
- Use ONLY facts explicitly present. Do not invent attendees, decisions, or action items.
- Deduplicate repeated points across partial notes.
- Overview is always first when included.`
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 */
function buildSessionMetaBlock(snapshot) {
  const durMin = sessionDurationMinutes(snapshot)
  return `Session mode: ${snapshot.modeName}
Duration: ~${durMin} minutes
Transcript lines: ${snapshot.transcriptLines.length}
Assistant exchanges: ${snapshot.exchanges.length}`
}

async function callSummaryLlm({ provider, apiKey, getStore, getAiClient, system, user, maxTokens }) {
  const model = providers.getModelForProvider(provider, getStore)
  return getAiClient().completeChat(
    provider,
    apiKey,
    {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model,
      maxTokens,
    },
    getStore,
  )
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 * @param {object} deps
 */
async function generateSinglePassSummary(snapshot, deps) {
  const { provider, apiKey, getStore, getAiClient } = deps
  const headings = resolveSectionHeadings(snapshot)
  const transcript = formatTranscriptBlock(snapshot.transcriptLines).slice(0, MAX_TRANSCRIPT_FOR_LLM)
  const qa = formatQaBlock(snapshot.exchanges).slice(0, MAX_QA_FOR_LLM)

  const user = `${buildSessionMetaBlock(snapshot)}

## TRANSCRIPT
${transcript || '(no transcript captured)'}

## ASSISTANT Q&A (user questions / auto-assists and model answers)
${qa || '(no assistant exchanges)'}`

  const text = await callSummaryLlm({
    provider,
    apiKey,
    getStore,
    getAiClient,
    system: buildSystemPrompt(headings),
    user,
    maxTokens: 2400,
  })
  return String(text || '').trim()
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 * @param {object} deps
 */
async function generateChunkedSummary(snapshot, deps) {
  const { provider, apiKey, getStore, getAiClient } = deps
  const headings = resolveSectionHeadings(snapshot)
  const chunks = chunkTranscriptLines(snapshot.transcriptLines)
  const partials = []

  for (let i = 0; i < chunks.length; i += 1) {
    const block = formatTranscriptBlock(chunks[i])
    const user = `${buildSessionMetaBlock(snapshot)}
Segment ${i + 1} of ${chunks.length}

## TRANSCRIPT SEGMENT
${block}`
    const text = await callSummaryLlm({
      provider,
      apiKey,
      getStore,
      getAiClient,
      system: buildSystemPrompt(headings, { partial: true }),
      user,
      maxTokens: 700,
    })
    const trimmed = String(text || '').trim()
    if (trimmed) partials.push(trimmed)
  }

  if (!partials.length) return ''

  const qa = formatQaBlock(snapshot.exchanges).slice(0, MAX_QA_FOR_LLM)
  const mergeUser = `${buildSessionMetaBlock(snapshot)}

## PARTIAL NOTES (from transcript segments — dedupe when merging)
${partials.map((p, i) => `### Segment ${i + 1}\n${p}`).join('\n\n')}

## ASSISTANT Q&A (full log)
${qa || '(no assistant exchanges)'}`

  const merged = await callSummaryLlm({
    provider,
    apiKey,
    getStore,
    getAiClient,
    system: buildSystemPrompt(headings),
    user: mergeUser,
    maxTokens: 2600,
  })
  return String(merged || '').trim()
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot} snapshot
 * @param {{ store: { get: Function }, getAiClient: Function }} deps
 */
async function generateMeetingSummary(snapshot, { store, getAiClient }) {
  const fallback = buildFallbackSummary(snapshot)
  const provider = store.get('provider') || 'groq'
  const keyField = providers.getApiKeyField(provider)
  const apiKey = store.get(keyField)
  if (!apiKey) {
    return { text: finalizeSummaryText(fallback), source: 'fallback', pipeline: 'v3' }
  }

  const transcript = formatTranscriptBlock(snapshot.transcriptLines)
  const qa = formatQaBlock(snapshot.exchanges)
  if (!transcript.trim() && !qa.trim()) {
    return { text: finalizeSummaryText(fallback), source: 'fallback', pipeline: 'v3' }
  }

  const getStore = (k) => store.get(k)
  const llmDeps = { provider, apiKey, getStore, getAiClient }

  try {
    const useChunked = estimateMaterialSize(snapshot) > SINGLE_PASS_CHAR_LIMIT
    const text = useChunked
      ? await generateChunkedSummary(snapshot, llmDeps)
      : await generateSinglePassSummary(snapshot, llmDeps)

    if (!text || text.length < 40) {
      return { text: finalizeSummaryText(fallback), source: 'fallback', pipeline: 'v3' }
    }
    return {
      text: normalizeMeetingSummaryMarkdown(text),
      source: 'llm',
      pipeline: useChunked ? 'v3-chunked' : 'v3',
    }
  } catch (err) {
    console.warn('[meeting-summary] LLM failed:', err?.message || err)
    return { text: finalizeSummaryText(fallback), source: 'fallback', pipeline: 'v3' }
  }
}

function finalizeSummaryText(text) {
  return normalizeMeetingSummaryMarkdown(text)
}

module.exports = {
  generateMeetingSummary,
  buildFallbackSummary,
  chunkTranscriptLines,
  resolveSectionHeadings,
  estimateMaterialSize,
  normalizeMeetingSummaryMarkdown: finalizeSummaryText,
  SINGLE_PASS_CHAR_LIMIT,
}
