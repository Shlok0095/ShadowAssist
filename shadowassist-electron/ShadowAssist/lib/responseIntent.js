// Copyright (c) 2026 ShadowAssist. All rights reserved.

/** @typedef {'coding' | 'interview' | 'process' | 'explanation' | 'smalltalk'} ResponseIntent */

/** Pure social greetings / small-talk — intent must be decided on userQuestion alone, ignore screen OCR. */
const SMALLTALK_RE =
  /^[\s\W]*(hey|hi|hello|howdy|hiya|yo)\b.{0,80}$|^[\s\W]*how (are|r) (you|u)(\s+(doing|going|feeling|holding up))?\??\s*$|^[\s\W]*(what'?s up|wassup|sup)\??\s*$|^[\s\W]*good (morning|afternoon|evening|day)\b.{0,40}$/i

const CODING_RE =
  /\b(provide (me )?(with )?(the )?code|give me (the )?code|write\s+(the\s+)?code|show\s+(me\s+)?(the\s+)?code|(?:python|javascript|typescript|java|go|rust|c\+\+|sql)\s+code|code\s+(of|for|in|using|to)|sample code|example code|implement|debug|fix\s+(this|the)\s+(bug|error)|leetcode|time complexity|space complexity|syntax error|compile|refactor|api endpoint|sql query|regex|function\s+that|class\s+that|script\s+to|in\s+(python|javascript|typescript|java|go|rust|c\+\+)|program(ming)?\s+(problem|question)?)\b/i

/** Algorithm / data-structure asks — even without the word "code". */
const ALGORITHM_RE =
  /\b(find (the )?(first|second|third)?\s*(largest|smallest|max|min)|second largest|largest number|smallest number|from (a |the )?list|given (an )?array|array of|sort (a |the )?|binary search|dynamic programming|recursion|two sum|palindrome|fibonacci|linked list|hash ?map|stack|queue|big[- ]o|O\(\s*n|iterate through (the )?list|return (the )?(max|min|sum|count))\b/i

const ML_TOPIC_RE =
  /\b((logistic|linear|polynomial|ridge|lasso)\s+regression|random forest|decision tree|naive bayes|k[- ]means|gradient descent|neural network|scikit[- ]learn|sklearn)\b/i

const CODE_ASK_RE = /\b(code|python|implement|sample|example|sklearn|scikit)\b/i

/** Visible coding problem on screen (LeetCode, IDE, etc.). */
const SCREEN_CODE_RE =
  /\b(coding question|group_anagrams|anagram|write a function|implement a function|complete the (code|function)|def |function\s+\w+\s*\(|class Solution|leetcode|hacker\s*rank|fix (the )?(bug|code)|syntax error|Traceback|public static|#include|import \w+)\b/i

const PROCESS_RE =
  /\b(steps?\s+(to|we|for)|how (do|can|should) we|what steps|sales|insurance|strategy|workflow|pitch|approach|onboard|policy|customer|procedure|playbook|objection|provide (the )?sales)\b/i

/**
 * @param {string} text
 */
function looksLikeCodeScreen(text) {
  const t = String(text || '')
  return SCREEN_CODE_RE.test(t) || ALGORITHM_RE.test(t) || /\b(function|=>|class Solution)\b/.test(t)
}

const COACHING_MODE_RE =
  /\b(sales|recruiting|interview|looking for work|team meet|meeting|lecture|gen ai|data science|general)\b/i

/** User is the interviewee (not the interviewer). Matches mode name or content. */
const INTERVIEWEE_MODE_RE = /\blooking for work\b/i
/** "I am in a job/technical/data science interview" — excludes "I am interviewing a candidate" */
const INTERVIEWEE_CONTENT_RE = /\bi am (?:in a|a .{1,60}? in a) .{0,40}interview\b/i

/**
 * @param {{ userQuestion?: string, transcript?: string, screen?: string, activeModeName?: string, activeModeContent?: string }} ctx
 * @returns {ResponseIntent}
 */
function inferResponseIntent({
  userQuestion = '',
  transcript = '',
  screen = '',
  activeModeName = '',
  activeModeContent = '',
} = {}) {
  // Small-talk / greeting: decide purely on the typed question — never let OCR screen content override this.
  if (SMALLTALK_RE.test(String(userQuestion || '').trim())) return 'smalltalk'

  const text = `${userQuestion}\n${transcript}\n${screen}`.trim()
  const modeLabel = `${activeModeName}\n${activeModeContent}`.trim()
  if (
    CODING_RE.test(text) ||
    ALGORITHM_RE.test(text) ||
    (ML_TOPIC_RE.test(text) && CODE_ASK_RE.test(text)) ||
    looksLikeCodeScreen(screen)
  ) {
    return 'coding'
  }
  // Interview mode: user is the interviewee → answer in first person (takes priority over process)
  if (
    INTERVIEWEE_MODE_RE.test(activeModeName) ||
    INTERVIEWEE_CONTENT_RE.test(activeModeContent)
  ) {
    return 'interview'
  }
  if (PROCESS_RE.test(text)) return 'process'
  if (modeLabel && COACHING_MODE_RE.test(modeLabel)) return 'process'
  if (!text) return 'explanation'
  return 'explanation'
}

/** @param {string} text */
function isCodingQuestion(text) {
  return inferResponseIntent({ userQuestion: text }) === 'coding'
}

/** @param {ResponseIntent} intent */
function getIntentRoutingHint(intent) {
  switch (intent) {
    case 'coding':
      return [
        'This is a CODING/IMPLEMENTATION question — ignore any "no code by default" rule above.',
        'After Takeaway and 1–2 explanation paragraphs, you MUST include a complete runnable solution inside a fenced code block (```python or the right language).',
        'Never substitute a "Python Code" heading or prose description for the actual fenced code.',
        'High-level steps may go under ## Details, but the real code must appear in the main answer body.',
      ].join(' ')
    case 'interview':
      return [
        'INTERVIEW MODE — the user is the interviewee. Your job is to provide the ANSWER they should speak.',
        'Answer DIRECTLY in first person ("I ...") as if you ARE the user responding to this question.',
        'NEVER narrate or describe the question (do NOT write "The interviewer asked..." or "The participant is asking...").',
        'NEVER open with a coaching tip or meta-commentary — start with the answer immediately.',
        'Format: 1–2 sentence direct answer → 2–3 supporting points (bullet or prose). Under 120 words unless technical depth is explicitly needed.',
        'Behavioral questions: use STAR structure briefly (situation, task, action, result — 1 sentence each).',
        'Write in natural spoken language the user can read aloud during a live call.',
      ].join(' ')
    case 'smalltalk':
      return 'This is casual small-talk or a social greeting. Reply naturally and conversationally in 1–2 sentences. Do NOT reference screen content, code, or meeting context. Do NOT produce lists, code blocks, or structured answer formats.'
    case 'process':
      return 'Process/strategy/sales/coaching question: answer in prose as a live coach. Put step-by-step lists under ## Details only. Do NOT output programming code, example classes, scripts, or pseudo-code implementations. Do NOT use unclear-screen disclaimers — follow the ACTIVE PROMPT role.'
    default:
      return 'Explain in prose. Do NOT output code fences, scripts, or example programs unless the user explicitly asked for code or implementation.'
  }
}

module.exports = {
  inferResponseIntent,
  isCodingQuestion,
  looksLikeCodeScreen,
  getIntentRoutingHint,
}
