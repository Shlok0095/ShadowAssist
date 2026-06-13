// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Mirror of lib/responseIntent.js for the renderer bundle.

const CODING_RE =
  /\b(provide (me )?(with )?(the )?code|give me (the )?code|write\s+(the\s+)?code|show\s+(me\s+)?(the\s+)?code|(?:python|javascript|typescript|java|go|rust|c\+\+|sql)\s+code|code\s+(of|for|in|using|to)|sample code|example code|implement|debug|fix\s+(this|the)\s+(bug|error)|leetcode|time complexity|space complexity|syntax error|compile|refactor|api endpoint|sql query|regex|function\s+that|class\s+that|script\s+to|in\s+(python|javascript|typescript|java|go|rust|c\+\+)|program(ming)?\s+(problem|question)?)\b/i

const ALGORITHM_RE =
  /\b(find (the )?(first|second|third)?\s*(largest|smallest|max|min)|second largest|largest number|smallest number|from (a |the )?list|given (an )?array|array of|sort (a |the )?|binary search|dynamic programming|recursion|two sum|palindrome|fibonacci|linked list|hash ?map|stack|queue|big[- ]o|O\(\s*n|iterate through (the )?list|return (the )?(max|min|sum|count))\b/i

const ML_TOPIC_RE =
  /\b((logistic|linear|polynomial|ridge|lasso)\s+regression|random forest|decision tree|naive bayes|k[- ]means|gradient descent|neural network|scikit[- ]learn|sklearn)\b/i

const CODE_ASK_RE = /\b(code|python|implement|sample|example|sklearn|scikit)\b/i

const SCREEN_CODE_RE =
  /\b(coding question|group_anagrams|anagram|write a function|implement a function|complete the (code|function)|def |function\s+\w+\s*\(|class Solution|leetcode|hacker\s*rank|fix (the )?(bug|code)|syntax error|Traceback|public static|#include|import \w+)\b/i

const PROCESS_RE =
  /\b(steps?\s+(to|we|for)|how (do|can|should) we|what steps|sales|insurance|strategy|workflow|pitch|approach|onboard|policy|customer|procedure|playbook|objection|provide (the )?sales)\b/i

export function looksLikeCodeScreen(text) {
  const t = String(text || '')
  return SCREEN_CODE_RE.test(t) || ALGORITHM_RE.test(t) || /\b(function|=>|class Solution)\b/.test(t)
}

export function inferResponseIntent({ userQuestion = '', transcript = '', screen = '' } = {}) {
  const text = `${userQuestion}\n${transcript}\n${screen}`.trim()
  if (!text) return 'explanation'
  if (
    CODING_RE.test(text) ||
    ALGORITHM_RE.test(text) ||
    (ML_TOPIC_RE.test(text) && CODE_ASK_RE.test(text)) ||
    looksLikeCodeScreen(screen)
  ) {
    return 'coding'
  }
  if (PROCESS_RE.test(text)) return 'process'
  return 'explanation'
}

export function isCodingQuestion(text) {
  return inferResponseIntent({ userQuestion: text }) === 'coding'
}
