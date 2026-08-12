// Copyright (c) 2026 VeilAssist. All rights reserved.
// Lightweight AnswerPlanner — Natively AnswerPlanner.ts subset (deterministic, no LLM).

/** @typedef {'identity_answer'|'coding_question_answer'|'technical_concept_answer'|'sales_answer'|'lecture_answer'|'behavioral_interview_answer'|'jd_fit_answer'|'jd_fact_answer'|'general_meeting_answer'|'general_assistant'} AnswerType */
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

/** First-person / candidate-background cues — never treat as pure technical-concept. */
const CANDIDATE_EXPERIENCE_RE =
  /\b(tell me about yourself|introduce yourself|walk me through your (background|experience|resume|cv|career)|tell me (about )?your (experience|background|resume|cv|career|work|projects?|skills?)|describe your (experience|background|resume|career)|what(?:'s| is) your (experience|background|strength|weakness)|why (should|would) (we|they) hire you|have you (ever )?(used|worked|built|led|done)|did you (use|work|build|lead)|your experience (with|in|using)|experience with .{0,40}\b(you|your|i|my)\b|\byour\b.{0,30}\b(experience|background|resume|cv|projects?|skills?)\b|\bmy\b.{0,30}\b(experience|background|resume|cv|projects?)\b)/i

const SALES_RE =
  /\b(pricing|objection|demo|pilot|procurement|roi|competitor|close the deal|upsell|discount|stakeholder)\b/i

const LECTURE_RE =
  /\b(lecture|syllabus|theorem|exam|homework|professor|instructor|concept|definition|derivation)\b/i

const BEHAVIORAL_RE =
  /\b(tell me about a time|star method|behavioral|conflict with|leadership example|weakness|strength|challenging (project|situation)|how did you handle)\b/i

const JD_FIT_RE =
  /\b(job description|fit for (the|this) role|why (should|would) (we|they) hire|am i (a )?good fit|match (the|this) (role|jd|job)|gap (analysis|against)|how (do|does) my (resume|background|experience) (fit|match))\b/i

/** JD as target-role source (not the candidate's claimed experience). */
const JD_FACT_RE =
  /\b((this|the) (jd|job description|role|position)|what does (this|the) (role|jd|job)|does (the|this) (jd|job|role)|requirements? (for|of|in) (this|the) (role|jd|job)|qualifications? (for|of|in) (this|the)|job description (say|mention|require|list)|top skills for (this|the) role)\b/i

const IDENTITY_RE =
  /\b(what('s| is) your name|who are you|introduce yourself|tell me about yourself|walk me through your background|tell me your experience)\b/i

/** Definition / meaning asks — answer from world knowledge, not resume honesty. */
const DEFINITIONAL_RE =
  /^(?:ok(?:ay)?[,.]?\s*|so[,.]?\s*|hey[,.]?\s*|please\s+|can you\s+|could you\s+|quick\s+)?(?:what(?:'s| is| are| does| do)|who(?:'s| is| are)|where(?:'s| is| are)|when(?:'s| is| was| were)|which|define|explain|describe|tell me (?:about|what)|how does|how do|difference between|compare)\b/i

/** Soft interview prompts that still want resume nearby (not definitions). */
const INTERVIEW_ASSIST_RE =
  /\b(what should i (say|answer|reply)|how (should|do) i (answer|respond|reply)|help me answer|talking points?|pitch myself)\b/i

const MODE_TEMPLATE_TYPES = new Set([
  'general', 'sales', 'recruiting', 'team-meet', 'lecture', 'technical-interview', 'looking-for-work',
])

function isCandidateExperienceQuestion(question) {
  const q = String(question || '')
  if (!q.trim()) return false
  return CANDIDATE_EXPERIENCE_RE.test(q) || IDENTITY_RE.test(q) || BEHAVIORAL_RE.test(q)
}

function isTechnicalConceptQuestion(question) {
  const q = String(question || '')
  if (isCandidateExperienceQuestion(q)) return false
  return TECHNICAL_EXPLANATION_RE.test(q)
    && TECHNICAL_SUBJECT_RE.test(q)
    && !TECHNICAL_ACTION_RE.test(q)
}

/**
 * General-knowledge / definition asks (incl. unknown terms like "what is shapp?").
 * Not about the candidate's lived experience — LLM world knowledge is the right source.
 */
function isGeneralKnowledgeQuestion(question) {
  const q = String(question || '').trim()
  if (!q || isCandidateExperienceQuestion(q) || JD_FIT_RE.test(q) || JD_FACT_RE.test(q)) return false
  if (CODING_RE.test(q) || TECHNICAL_ACTION_RE.test(q)) return false
  if (INTERVIEW_ASSIST_RE.test(q)) return false
  if (isTechnicalConceptQuestion(q)) return true
  return DEFINITIONAL_RE.test(q)
}

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
  const interviewMode = mode === 'technical-interview' || mode === 'looking-for-work' || mode === 'recruiting'

  /** @type {AnswerType} */
  let answerType = 'general_meeting_answer'
  /** @type {ProfileContextPolicy} */
  let profileContextPolicy = 'allowed'
  /** @type {ContextLayer[]} */
  let required = ['active_mode']
  /** @type {ContextLayer[]} */
  let forbidden = []

  if (CODING_RE.test(q)) {
    answerType = 'coding_question_answer'
    profileContextPolicy = 'forbidden'
    required = ['screen_context']
    forbidden = ['resume', 'jd', 'custom_context', 'reference_files', 'prior_assistant_responses']
  } else if (IDENTITY_RE.test(q) && hasProfile) {
    answerType = 'identity_answer'
    profileContextPolicy = 'required'
    required = ['resume', 'active_mode', 'stable_identity']
  } else if (JD_FIT_RE.test(q) && (hasJd || hasProfile)) {
    answerType = 'jd_fit_answer'
    profileContextPolicy = 'required'
    required = hasJd && hasProfile
      ? ['jd', 'resume', 'active_mode']
      : hasJd
        ? ['jd', 'active_mode']
        : ['resume', 'active_mode']
  } else if (JD_FACT_RE.test(q) && hasJd && !isCandidateExperienceQuestion(q)) {
    answerType = 'jd_fact_answer'
    profileContextPolicy = 'allowed'
    required = ['jd', 'active_mode']
  } else if ((BEHAVIORAL_RE.test(q) || isCandidateExperienceQuestion(q)) && (hasProfile || interviewMode)) {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = hasProfile ? 'required' : 'allowed'
    required = hasProfile ? ['resume', 'active_mode'] : ['active_mode']
  } else if (isTechnicalConceptQuestion(q) || isGeneralKnowledgeQuestion(q)) {
    // Human fallback: definitions / "what is X?" use world knowledge — do not gate on resume.
    answerType = isTechnicalConceptQuestion(q) ? 'technical_concept_answer' : 'general_assistant'
    profileContextPolicy = 'forbidden'
    required = ['active_mode', 'live_transcript', 'screen_context']
    forbidden = ['resume', 'jd', 'custom_context', 'reference_files', 'prior_assistant_responses']
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
  } else if (interviewMode && INTERVIEW_ASSIST_RE.test(q)) {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = hasProfile ? 'required' : 'allowed'
    required = hasProfile ? ['active_mode', 'resume'] : ['active_mode']
  } else if (interviewMode && (source === 'what_to_answer' || source === 'transcript') && !q) {
    // Empty assist trigger in interview — keep resume nearby for next spoken ask.
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = hasProfile ? 'required' : 'allowed'
    required = hasProfile ? ['active_mode', 'live_transcript', 'resume'] : ['active_mode', 'live_transcript']
  } else if (interviewMode) {
    // Soft interview default: resume available for angle, but answer may use general knowledge.
    answerType = 'general_assistant'
    profileContextPolicy = 'allowed'
    required = hasProfile ? ['active_mode', 'resume'] : ['active_mode']
  } else if (source === 'what_to_answer' || source === 'transcript') {
    required = ['active_mode', 'live_transcript']
    if (interviewMode && hasProfile) {
      required = ['active_mode', 'live_transcript', 'resume']
      profileContextPolicy = 'allowed'
    }
  }

  if (profileContextPolicy === 'forbidden') {
    forbidden = [...new Set([...forbidden, 'resume', 'jd', 'custom_context'])]
  }

  let maxFirstUsefulTokenMs = 1800
  if (answerType === 'coding_question_answer') maxFirstUsefulTokenMs = 2500
  if (answerType === 'jd_fit_answer' || answerType === 'jd_fact_answer') maxFirstUsefulTokenMs = 2200

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
  isCandidateExperienceQuestion,
  isTechnicalConceptQuestion,
  isGeneralKnowledgeQuestion,
  modeTemplateFromPrompt,
  MODE_TEMPLATE_TYPES,
}
