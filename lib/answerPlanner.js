// Copyright (c) 2026 VeilAssist. All rights reserved.
// Lightweight AnswerPlanner — Natively AnswerPlanner.ts subset (deterministic, no LLM).

/** @typedef {'identity_answer'|'coding_question_answer'|'technical_concept_answer'|'sales_answer'|'lecture_answer'|'behavioral_interview_answer'|'jd_fit_answer'|'general_meeting_answer'|'general_assistant'} AnswerType */
/** @typedef {'manual_input'|'what_to_answer'|'transcript'|'system'} AnswerSource */
/** @typedef {'required'|'allowed'|'forbidden'} ProfileContextPolicy */
/** @typedef {'stable_identity'|'resume'|'jd'|'custom_context'|'reference_files'|'live_transcript'|'active_mode'|'screen_context'|'prior_assistant_responses'} ContextLayer */

const CODING_RE =
  /\b(algorithm|leetcode|complexity|big\s*o|implement\s+(a|the|this)?\s*function|whiteboard|system design|debug|compile error|time complexity|space complexity|binary search|dynamic programming|dfs|bfs|linked list|hash map|recursion)\b|(?:\b(?:provide|write|show|give|create|generate|build)\b.{0,60}\b(?:code|html|css|javascript|typescript|react component|web(?:site| page| development)|svg)\b)|(?:\b(?:code|html|css|javascript|typescript|svg)\b.{0,60}\b(?:create|build|make|implement|render)\b)/i

const TECHNICAL_EXPLANATION_RE =
  /\b(explain|what(?:'s| is| are)|describe|how does|how do|define|difference between|compare)\b/i
const TECHNICAL_ACTION_RE =
  /\b(write|implement|code|debug|fix|solve)\b/i
const TECHNICAL_SUBJECT_RE =
  /\b(transformers?|attention|neural network|machine learning|deep learning|model architecture|software architecture|distributed system|database|sql|nosql|api|rest|graphql|grpc|microservice|cache|redis|kafka|docker|kubernetes|cloud|aws|azure|gcp|http|tcp|udp|dns|oauth|jwt|cors|encryption|hashing|thread|process|concurrency|deadlock|mutex|semaphore|event loop|promise|async|react|node\.?js|python|java|javascript|typescript|data structure|algorithm|binary search|recursion|complexity)\b/i

function isTechnicalConceptQuestion(question) {
  const q = String(question || '')
  return TECHNICAL_EXPLANATION_RE.test(q)
    && TECHNICAL_SUBJECT_RE.test(q)
    && !TECHNICAL_ACTION_RE.test(q)
}

const SALES_RE =
  /\b(pricing|objection|demo|pilot|procurement|roi|competitor|close the deal|upsell|discount|stakeholder)\b/i

const LECTURE_RE =
  /\b(lecture|syllabus|theorem|exam|homework|professor|instructor|concept|definition|derivation)\b/i

const BEHAVIORAL_RE =
  /\b(tell me about a time|star method|behavioral|conflict with|leadership example|weakness|strength)\b/i

const JD_FIT_RE =
  /\b(job description|fit for (the|this) role|requirements|qualifications|why (should|would) (we|they) hire)\b/i

const IDENTITY_RE =
  /\b(what('s| is) your name|who are you|introduce yourself|tell me about yourself)\b/i

const MODE_TEMPLATE_TYPES = new Set([
  'general', 'sales', 'recruiting', 'team-meet', 'lecture', 'technical-interview', 'looking-for-work',
])

/**
 * @param {{ name?: string }} prompt
 * @returns {string}
 */
function modeTemplateFromPrompt(prompt) {
  const n = String(prompt?.name || '').toLowerCase()
  if (/sales/.test(n)) return 'sales'
  if (/recruit/.test(n)) return 'recruiting'
  if (/lecture|class|course/.test(n)) return 'lecture'
  if (/meeting|team|standup|sync|retro/.test(n)) return 'team-meet'
  if (/technical|coding|system design/.test(n)) return 'technical-interview'
  if (/interview/.test(n)) return 'looking-for-work'
  return 'general'
}

/**
 * @param {object} input
 * @returns {{
 *   answerType: AnswerType,
 *   profileContextPolicy: ProfileContextPolicy,
 *   requiredContextLayers: ContextLayer[],
 *   forbiddenContextLayers: ContextLayer[],
 *   maxFirstUsefulTokenMs: number,
 * }}
 */
function planAnswer(input = {}) {
  const q = String(input.question || '').trim()
  const source = input.source || 'manual_input'
  const mode = String(input.activeMode || input.activeModeInfo?.templateType || 'general')
  const hasProfile = !!input.hasCandidateProfile
  const hasJd = !!input.hasJobDescription

  /** @type {AnswerType} */
  let answerType = 'general_meeting_answer'
  /** @type {ProfileContextPolicy} */
  let profileContextPolicy = 'allowed'
  /** @type {ContextLayer[]} */
  let required = ['active_mode']
  /** @type {ContextLayer[]} */
  let forbidden = []

  if (isTechnicalConceptQuestion(q)) {
    answerType = 'technical_concept_answer'
    profileContextPolicy = 'forbidden'
    required = ['active_mode', 'live_transcript', 'screen_context']
    forbidden = ['resume', 'jd', 'custom_context', 'reference_files', 'prior_assistant_responses']
  } else if (CODING_RE.test(q)) {
    answerType = 'coding_question_answer'
    profileContextPolicy = 'forbidden'
    required = ['screen_context']
    forbidden = ['resume', 'jd', 'custom_context', 'reference_files', 'prior_assistant_responses']
  } else if (IDENTITY_RE.test(q) && hasProfile) {
    answerType = 'identity_answer'
    profileContextPolicy = 'required'
    required = ['resume', 'active_mode', 'stable_identity']
  } else if (JD_FIT_RE.test(q) && hasJd) {
    answerType = 'jd_fit_answer'
    profileContextPolicy = 'required'
    required = ['jd', 'resume', 'active_mode']
  } else if (BEHAVIORAL_RE.test(q)) {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = 'required'
    required = ['resume', 'active_mode']
  } else if (SALES_RE.test(q) || mode === 'sales') {
    answerType = 'sales_answer'
    profileContextPolicy = 'forbidden'
    required = ['active_mode', 'reference_files', 'live_transcript']
    forbidden = ['resume', 'jd']
  } else if (LECTURE_RE.test(q) || mode === 'lecture') {
    answerType = 'lecture_answer'
    profileContextPolicy = 'forbidden'
    required = ['active_mode', 'live_transcript']
    forbidden = ['resume', 'jd', 'reference_files']
  } else if (mode === 'technical-interview' || mode === 'looking-for-work') {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = 'allowed'
    required = ['active_mode', 'resume']
  } else if (source === 'what_to_answer' || source === 'transcript') {
    required = ['active_mode', 'live_transcript']
  }

  if (profileContextPolicy === 'forbidden') {
    forbidden = [...new Set([...forbidden, 'resume', 'jd', 'custom_context'])]
  }

  let maxFirstUsefulTokenMs = 1800
  if (answerType === 'coding_question_answer') maxFirstUsefulTokenMs = 2500
  if (answerType === 'jd_fit_answer') maxFirstUsefulTokenMs = 2200

  return {
    answerType,
    profileContextPolicy,
    requiredContextLayers: required,
    forbiddenContextLayers: forbidden,
    maxFirstUsefulTokenMs,
    modeTemplate: MODE_TEMPLATE_TYPES.has(mode) ? mode : 'general',
  }
}

function isCodingAnswerType(answerType) {
  return answerType === 'coding_question_answer'
}

module.exports = {
  planAnswer,
  isCodingAnswerType,
  modeTemplateFromPrompt,
  MODE_TEMPLATE_TYPES,
}
