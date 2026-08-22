/** Mobile interview routing — mirrors lib/answerPlanner.js (deterministic, no LLM). */

export type ProfileContextPolicy = 'required' | 'allowed' | 'forbidden'

export type RouteDecision = {
  answerType: string
  profileContextPolicy: ProfileContextPolicy
  useResume: boolean
  useJd: boolean
  answerContract: string
}

const CODING_RE =
  /\b(algorithm|leetcode|complexity|big\s*o|implement\s+(a|the|this)?\s*function|whiteboard|system design|debug|compile error|time complexity|space complexity|binary search|dynamic programming|dfs|bfs|linked list|hash map|recursion)\b/i

const TECHNICAL_EXPLANATION_RE =
  /\b(explain|what(?:'s| is| are)|describe|how does|how do|define|difference between|compare)\b/i
const TECHNICAL_ACTION_RE = /\b(write|implement|code|debug|fix|solve)\b/i
const TECHNICAL_SUBJECT_RE =
  /\b(transformers?|attention|neural network|machine learning|deep learning|model architecture|software architecture|distributed system|database|sql|nosql|api|rest|graphql|grpc|microservice|cache|redis|kafka|docker|kubernetes|cloud|aws|azure|gcp|http|tcp|udp|dns|oauth|jwt|cors|encryption|hashing|thread|process|concurrency|deadlock|mutex|semaphore|event loop|promise|async|react|node\.?js|python|java|javascript|typescript|data structure|algorithm|binary search|recursion|complexity)\b/i

const CANDIDATE_EXPERIENCE_RE =
  /\b(tell me about yourself|introduce yourself|walk me through your (background|experience|resume|cv|career)|tell me (about )?your (experience|background|resume|cv|career|work|projects?|skills?)|describe your (experience|background|resume|career)|what(?:'s| is) your (experience|background|strength|weakness)|why (should|would) (we|they) hire you|have you (ever )?(used|worked|built|led|done)|did you (use|work|build|lead)|your experience (with|in|using)|experience with .{0,40}\b(you|your|i|my)\b|\byour\b.{0,30}\b(experience|background|resume|cv|projects?|skills?)\b|\bmy\b.{0,30}\b(experience|background|resume|cv|projects?)\b)/i

const BEHAVIORAL_RE =
  /\b(tell me about a time|star method|behavioral|conflict with|leadership example|weakness|strength|challenging (project|situation)|how did you handle)\b/i

const JD_FIT_RE =
  /\b(job description|fit for (the|this) role|why (should|would) (we|they) hire|am i (a )?good fit|match (the|this) (role|jd|job)|gap (analysis|against)|how (do|does) my (resume|background|experience) (fit|match))\b/i

const JD_FACT_RE =
  /\b((this|the) (jd|job description|role|position)|what does (this|the) (role|jd|job)|does (the|this) (jd|job|role)|requirements? (for|of|in) (this|the) (role|jd|job)|qualifications? (for|of|in) (this|the)|job description (say|mention|require|list)|top skills for (this|the) role)\b/i

const IDENTITY_RE =
  /\b(what('s| is) your name|who are you|introduce yourself|tell me about yourself|walk me through your background|tell me your experience)\b/i

const DEFINITIONAL_RE =
  /^(?:ok(?:ay)?[,.]?\s*|so[,.]?\s*|hey[,.]?\s*|please\s+|can you\s+|could you\s+|quick\s+)?(?:what(?:'s| is| are| does| do)|who(?:'s| is| are)|where(?:'s| is| are)|when(?:'s| is| was| were)|which|define|explain|describe|tell me (?:about|what)|how does|how do|difference between|compare)\b/i

function isCandidateExperienceQuestion(question: string): boolean {
  const q = String(question || '')
  if (!q.trim()) return false
  return CANDIDATE_EXPERIENCE_RE.test(q) || IDENTITY_RE.test(q) || BEHAVIORAL_RE.test(q)
}

function isTechnicalConceptQuestion(question: string): boolean {
  const q = String(question || '')
  if (isCandidateExperienceQuestion(q)) return false
  return TECHNICAL_EXPLANATION_RE.test(q) && TECHNICAL_SUBJECT_RE.test(q) && !TECHNICAL_ACTION_RE.test(q)
}

function isGeneralKnowledgeQuestion(question: string): boolean {
  const q = String(question || '').trim()
  if (!q || isCandidateExperienceQuestion(q) || JD_FIT_RE.test(q) || JD_FACT_RE.test(q)) return false
  if (CODING_RE.test(q) || TECHNICAL_ACTION_RE.test(q)) return false
  if (isTechnicalConceptQuestion(q)) return true
  return DEFINITIONAL_RE.test(q)
}

export function routeInterviewQuestion(input: {
  question: string
  hasProfile: boolean
  hasJd: boolean
  source?: 'manual_input' | 'transcript'
}): RouteDecision {
  const q = String(input.question || '').trim()
  const source = input.source || 'manual_input'
  const hasProfile = input.hasProfile
  const hasJd = input.hasJd
  const interviewMode = true

  let answerType = 'behavioral_interview_answer'
  let profileContextPolicy: ProfileContextPolicy = hasProfile ? 'allowed' : 'forbidden'
  let useResume = false
  let useJd = false
  let answerContract = 'interview_detailed'

  if (CODING_RE.test(q)) {
    answerType = 'coding_question_answer'
    profileContextPolicy = 'forbidden'
    answerContract = 'coding_answer'
  } else if (IDENTITY_RE.test(q) && hasProfile) {
    answerType = 'identity_answer'
    profileContextPolicy = 'required'
    useResume = true
  } else if (JD_FIT_RE.test(q) && (hasJd || hasProfile)) {
    answerType = 'jd_fit_answer'
    profileContextPolicy = 'required'
    useResume = hasProfile
    useJd = hasJd
  } else if (JD_FACT_RE.test(q) && hasJd && !isCandidateExperienceQuestion(q)) {
    answerType = 'jd_fact_answer'
    profileContextPolicy = 'allowed'
    useJd = true
  } else if (
    (BEHAVIORAL_RE.test(q) || isCandidateExperienceQuestion(q)) &&
    (hasProfile || interviewMode)
  ) {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = hasProfile ? 'required' : 'allowed'
    useResume = hasProfile
  } else if (isTechnicalConceptQuestion(q)) {
    answerType = 'technical_concept_answer'
    profileContextPolicy = 'forbidden'
    answerContract = 'technical_explanation'
  } else if (isGeneralKnowledgeQuestion(q)) {
    answerType = 'general_assistant'
    profileContextPolicy = 'forbidden'
    answerContract = 'general_assistant'
  } else if (interviewMode) {
    answerType = 'behavioral_interview_answer'
    profileContextPolicy = hasProfile ? 'required' : 'allowed'
    useResume = hasProfile && (source === 'transcript' || source === 'manual_input')
    answerContract = 'interview_detailed'
  }

  if (profileContextPolicy === 'forbidden') {
    useResume = false
    useJd = false
  }

  return {
    answerType,
    profileContextPolicy,
    useResume,
    useJd,
    answerContract,
  }
}

export function minCharsForDetection(level: 'low' | 'medium' | 'high'): number {
  if (level === 'low') return 24
  if (level === 'medium') return 14
  return 6
}
