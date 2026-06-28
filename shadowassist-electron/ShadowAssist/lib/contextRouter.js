// Copyright (c) 2026 VeilAssist. All rights reserved.
// Context routing — Natively ContextRouter.ts + contextRoute.ts (deterministic subset).

const { planAnswer, isCodingAnswerType } = require('./answerPlanner')

/** @typedef {import('./answerPlanner').ContextLayer} ContextLayer */

const ALL_LAYERS = /** @type {ContextLayer[]} */ ([
  'stable_identity',
  'resume',
  'jd',
  'custom_context',
  'reference_files',
  'live_transcript',
  'prior_assistant_responses',
  'active_mode',
  'screen_context',
])

const LAYER_BUDGET = {
  stable_identity: 200,
  resume: 1200,
  jd: 800,
  custom_context: 600,
  reference_files: 1200,
  live_transcript: 1500,
  prior_assistant_responses: 600,
  active_mode: 800,
  screen_context: 1200,
}

const RECALL_RE =
  /\b(last (time|meeting|call|session)|previous (meeting|call|session|conversation|discussion|time)|(earlier|before)\s+(meeting|call|session|conversation|we (?:discuss|talk|spoke|met|covered))|past (meetings?|calls?|sessions?|conversations?)|recurring (topic|theme|issue|question|pattern)|we (discuss|discussed|talked|spoke) (about|on)|did (we|they|i) (discuss|talk|cover|say|mention)|summari[sz]e (all|our|the|my)( (previous|past|recent|prior|last))? (meetings?|calls?|sessions?|conversations?)|what did .* (say|ask|mention) (about|last|before|earlier)|came up (in|before|earlier|previously)|prior (call|meeting|interview|session|conversation))\b/i

const IN_MEETING_SEARCH_RE =
  /\b(search (this|the current|current) (meeting|call|transcript)|find (where|when) .* (mention|said|asked)|in this (meeting|call|transcript))\b/i

/**
 * @param {string} query
 */
function isBackwardLookingQuery(query) {
  try {
    RECALL_RE.lastIndex = 0
    return typeof query === 'string' && RECALL_RE.test(query)
  } catch {
    return false
  }
}

/**
 * @param {ReturnType<typeof planAnswer>} plan
 */
function buildContextRoute(plan) {
  const required = new Set(plan.requiredContextLayers || [])
  const forbidden = new Set(plan.forbiddenContextLayers || [])

  const layers = ALL_LAYERS.map((layer) => {
    if (forbidden.has(layer)) {
      return { layer, selected: false, reason: 'forbidden_by_answer_type', tokenBudget: 0 }
    }
    if (required.has(layer)) {
      return {
        layer,
        selected: true,
        reason: 'required_by_answer_type',
        tokenBudget: LAYER_BUDGET[layer] ?? 400,
      }
    }
    if (layer === 'reference_files' && plan.profileContextPolicy !== 'forbidden') {
      return { layer, selected: true, reason: 'optional_reference', tokenBudget: LAYER_BUDGET.reference_files }
    }
    if (layer === 'resume' && plan.profileContextPolicy === 'required') {
      return { layer, selected: true, reason: 'required_profile', tokenBudget: LAYER_BUDGET.resume }
    }
    if (layer === 'jd' && plan.profileContextPolicy === 'required') {
      return { layer, selected: true, reason: 'required_jd', tokenBudget: LAYER_BUDGET.jd }
    }
    if (layer === 'active_mode') {
      return { layer, selected: true, reason: 'always_mode', tokenBudget: LAYER_BUDGET.active_mode }
    }
    return { layer, selected: false, reason: 'not_required_by_answer_type', tokenBudget: 0 }
  })

  const selectedLayers = layers.filter((l) => l.selected).map((l) => l.layer)
  return {
    answerType: plan.answerType,
    selectedLayers,
    excludedLayers: layers.filter((l) => !l.selected).map((l) => l.layer),
    layers,
    maxTotalPromptTokens: Math.max(
      1200,
      layers.reduce((sum, l) => sum + l.tokenBudget, 0) + 1200,
    ),
  }
}

function isLayerAllowed(plan, layer) {
  return !(plan.forbiddenContextLayers || []).includes(layer)
}

/**
 * @param {object} plan
 * @param {ContextLayer} layer
 */
function isRouteLayerSelected(route, layer) {
  return route.selectedLayers.includes(layer)
}

function inferDomainTag(plan, mode = 'general') {
  const m = String(mode || 'general')
  if (plan.answerType === 'sales_answer' || m === 'sales') return 'sales'
  if (plan.answerType === 'lecture_answer' || m === 'lecture') return 'lecture'
  if (
    plan.answerType === 'behavioral_interview_answer' ||
    plan.answerType === 'identity_answer' ||
    plan.answerType === 'jd_fit_answer'
  ) {
    return 'interview'
  }
  if (m === 'technical-interview' || m === 'looking-for-work' || m === 'recruiting') return 'interview'
  if (plan.answerType === 'general_meeting_answer' || m === 'team-meet') return 'meeting'
  return 'general'
}

const DOMAIN_ROUTING_HINTS = {
  interview:
    'Domain: interview — prioritize resume-backed STAR stories; tie answers to JD requirements when both are present.',
  sales:
    'Domain: sales — concise talk-track the user can say aloud; lean on playbook/reference facts; avoid resume/JD unless asked.',
  lecture:
    'Domain: lecture — structured notes, definitions, and examples; prioritize live transcript over profile text.',
  meeting:
    'Domain: meeting — capture decisions, owners, and action items; stay factual to transcript and recap.',
  general: 'Domain: general assistant — direct answer; include profile layers only when they help.',
}

function formatDomainRoutingBlock(domainTag) {
  const hint = DOMAIN_ROUTING_HINTS[domainTag] || DOMAIN_ROUTING_HINTS.general
  return `\n\n---\n## DOMAIN ROUTING\n${hint}`
}

/**
 * @param {object} input
 */
function routeContext(input = {}) {
  const userQuery = String(input.userQuery || '').trim()
  const source = input.source || 'manual_input'
  const mode = String(input.mode || input.activeMode || 'general')

  const plan = planAnswer({
    question: userQuery,
    source,
    activeMode: input.mode,
    hasCandidateProfile: input.profileAvailable,
    hasJobDescription: input.jdAvailable,
  })

  const contextRoute = buildContextRoute(plan)

  const liveSurface = source === 'what_to_answer' || source === 'transcript'
  const isRecallQuery = isBackwardLookingQuery(userQuery)
  const isInMeetingSearch = IN_MEETING_SEARCH_RE.test(userQuery)

  const useReferenceFiles =
    Boolean(input.referenceFilesAvailable) &&
    isRouteLayerSelected(contextRoute, 'reference_files') &&
    !isCodingAnswerType(plan.answerType)

  const useLiveTranscript =
    Boolean(input.hasLiveTranscript) &&
    (isRouteLayerSelected(contextRoute, 'live_transcript') || liveSurface)

  const useResume =
    Boolean(input.profileAvailable) &&
    isRouteLayerSelected(contextRoute, 'resume') &&
    plan.profileContextPolicy !== 'forbidden'

  const useJd =
    Boolean(input.jdAvailable) &&
    isRouteLayerSelected(contextRoute, 'jd') &&
    plan.profileContextPolicy !== 'forbidden'

  const useActiveMode = isRouteLayerSelected(contextRoute, 'active_mode')

  const useMeetingSummary = isRecallQuery && !isInMeetingSearch

  const useHindsightRecall =
    isRecallQuery &&
    !isInMeetingSearch &&
    !isCodingAnswerType(plan.answerType)

  const useHybridRag = isInMeetingSearch || isRecallQuery || plan.answerType === 'jd_fit_answer'

  const domainTag = inferDomainTag(plan, mode)
  const reasonParts = [`answerType=${plan.answerType}`, `policy=${plan.profileContextPolicy}`, `domain=${domainTag}`]
  if (useActiveMode) reasonParts.push('activeMode')
  if (useReferenceFiles) reasonParts.push('referenceFiles')
  if (useResume) reasonParts.push('resume')
  if (useJd) reasonParts.push('jd')
  if (useMeetingSummary) reasonParts.push('meetingSummary')
  if (useHindsightRecall) reasonParts.push('hindsight')
  if (useHybridRag) reasonParts.push('hybridRag')

  return {
    plan,
    contextRoute,
    useReferenceFiles,
    useLiveTranscript,
    useResume,
    useJd,
    useActiveMode,
    useMeetingSummary,
    useHybridRag,
    useHindsightRecall,
    domainTag,
    hindsightRecallTimeoutMs: 800,
    answerContract: contractFor(plan.answerType, input.mode),
    maxLatencyMs: plan.maxFirstUsefulTokenMs,
    reason: reasonParts.join(' '),
  }
}

function contractFor(answerType, mode) {
  if (isCodingAnswerType(answerType)) return 'coding_answer'
  if (answerType === 'sales_answer') return 'sales_reply'
  if (answerType === 'lecture_answer') return 'lecture_notes'
  if (answerType === 'behavioral_interview_answer' || answerType === 'identity_answer') return 'interview_detailed'
  if (mode === 'team-meet') return 'team_meeting_summary'
  return 'general_assistant'
}

const CONTRACT_HINTS = {
  coding_answer:
    'Answer contract: coding — provide approach, solution code, complexity, edge cases. Do not inject resume/JD.',
  sales_reply: 'Answer contract: sales — concise reply the user can say aloud; use playbook/reference facts only.',
  lecture_notes: 'Answer contract: lecture — structured notes, definitions, examples.',
  interview_detailed: 'Answer contract: interview — first-person candidate voice; ground in resume when relevant.',
  team_meeting_summary: 'Answer contract: team meeting — decisions, owners, action items.',
  general_assistant: 'Answer contract: general — direct, concise assistant answer.',
}

function formatAnswerContractBlock(answerContract) {
  const hint = CONTRACT_HINTS[answerContract]
  if (!hint) return ''
  return `\n\n---\n## ANSWER CONTRACT\n${hint}`
}

module.exports = {
  routeContext,
  buildContextRoute,
  isLayerAllowed,
  isRouteLayerSelected,
  isBackwardLookingQuery,
  formatAnswerContractBlock,
  formatDomainRoutingBlock,
  inferDomainTag,
  ALL_LAYERS,
}
