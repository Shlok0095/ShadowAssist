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
    // Inject resume when policy allows and the answer type is profile-grounded
    // (do NOT auto-inject JD just because policy is required — that fused JD into identity answers).
    const resumeAllowedInterviewish = [
      'behavioral_interview_answer',
      'identity_answer',
      'jd_fit_answer',
    ].includes(plan.answerType)
    if (
      layer === 'resume' &&
      plan.profileContextPolicy === 'allowed' &&
      resumeAllowedInterviewish
    ) {
      return { layer, selected: true, reason: 'allowed_profile', tokenBudget: LAYER_BUDGET.resume }
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
    plan.answerType === 'jd_fit_answer' ||
    plan.answerType === 'jd_fact_answer'
  ) {
    return 'interview'
  }
  if (m === 'technical-interview' || m === 'looking-for-work' || m === 'recruiting') return 'interview'
  if (m === 'team-meet') return 'meeting'
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
    answerContract: contractFor(plan.answerType, input.mode, userQuery),
    maxLatencyMs: plan.maxFirstUsefulTokenMs,
    reason: reasonParts.join(' '),
  }
}

const MEETING_SUMMARY_RE =
  /\b(summari[sz]e|summary|recap|meeting notes?|minutes|action items?|decisions?|owners?|open questions?|key takeaways?)\b/i

function contractFor(answerType, mode, question = '') {
  if (isCodingAnswerType(answerType)) return 'coding_answer'
  if (answerType === 'technical_concept_answer') return 'technical_explanation'
  if (answerType === 'general_assistant') return 'general_assistant'
  if (answerType === 'sales_answer') return 'sales_reply'
  if (answerType === 'lecture_answer') return 'lecture_notes'
  if (answerType === 'behavioral_interview_answer' || answerType === 'identity_answer') return 'interview_detailed'
  if (answerType === 'jd_fit_answer' || answerType === 'jd_fact_answer') return 'interview_detailed'
  if (mode === 'team-meet' && MEETING_SUMMARY_RE.test(String(question || ''))) {
    return 'team_meeting_summary'
  }
  return 'general_assistant'
}

const CONTRACT_HINTS = {
  coding_answer:
    'Answer contract: coding — provide approach, solution code, complexity, edge cases. Do not inject resume/JD.',
  technical_explanation:
    'Answer contract: technical explanation — answer the exact concept directly in 2–4 clear spoken sentences. Start with a plain definition, then explain the essential mechanism and one relevant tradeoff. No uncertainty fallback, code, tutorial sections, or unrelated screen discussion unless explicitly requested. Use general knowledge; do not refuse because the term is absent from resume/JD.',
  sales_reply: 'Answer contract: sales — concise reply the user can say aloud; use playbook/reference facts only.',
  lecture_notes: 'Answer contract: lecture — structured notes, definitions, examples.',
  interview_detailed:
    'Answer contract: interview (candidate facts) — first-person voice for experience/identity asks; ground personal claims ONLY in ## RESUME / BACKGROUND. Treat ## JOB DESCRIPTION as the target role (requirements/gaps), never as claimed experience. If a *personal* fact is missing from resume/JD, say so honestly — do not invent employers/titles/dates. For definitional or world-knowledge questions ("what is X?"), answer normally from general knowledge instead of refusing.',
  team_meeting_summary: 'Answer contract: team meeting — decisions, owners, action items.',
  general_assistant:
    'Answer contract: general — answer helpfully like a sharp human teammate. Prefer resume/JD only when the ask is about the candidate\'s own experience or role fit. For definitions, products, typos, news, or unknown terms: use general knowledge (best effort). Never refuse solely because a term is missing from resume/JD. Do not invent personal work history.',
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
  LAYER_BUDGET,
}
