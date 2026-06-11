// Copyright (c) 2026 ShadowAssist. All rights reserved.

const { inferResponseIntent, getIntentRoutingHint } = require('./responseIntent')

/** @typedef {'brief' | 'detailed'} AnswerStyle */

const BRIEF_ANSWER_RULES = `<answer_format>
Meeting-style replies — substantive depth, optimized for reading during a live call.

CRITICAL (overrides <technical_problems>, <emails_messages>, and any "start with code" instruction when they conflict):
- Default: **NO fenced code blocks** and no invented "example" programs — except for coding/implementation questions (see intent_routing).
- Code ONLY when the user clearly asks to write, fix, debug, or implement software (functions, APIs, SQL, scripts, leetcode, ML models).
- Sales, insurance, strategy, HR, "how do we", and process questions → **prose + optional numbered steps under ## Details** — never Python/Java/etc. "examples".

Structure:
1. **Takeaway** (2–3 sentences). Use **Takeaway:** or ## Takeaway.
2. **5–7 substantial paragraphs** (roughly 300–600 words): explain with depth, concrete examples, tradeoffs, edge cases, and what to say aloud. Connected prose — not bullet dumps in the main body.
3. **Steps or lists** (when helpful): after a horizontal rule (---), use ## Details with numbered steps or bullets. Do NOT put code there.
4. **Code fences**: for coding/algorithm/ML questions, include the **full working solution** in a fenced block after the explanation (before or after ## Details). For business/sales/process topics, never include code.

Skip filler ("Sure!", "Here's a summary", "Let me help").
</answer_format>`

const DETAILED_ANSWER_RULES = `<answer_format>
Use clear markdown structure when it helps. Lead with the direct answer, then explain with depth, examples, and nuance.
Do NOT include code unless the question requires implementation, debugging, or a code sample.
For process/strategy questions, prefer lists over code.
</answer_format>`

const CODING_ANSWER_OVERRIDE = `<coding_answer priority="override">
Coding/implementation question: you MUST include runnable code in a fenced block (e.g. \`\`\`python). Never use a "Python Code" heading with prose instead of real fenced code.
</coding_answer>`

/**
 * @param {unknown} style
 * @returns {AnswerStyle}
 */
function normalizeAnswerStyle(style) {
  return style === 'detailed' ? 'detailed' : 'brief'
}

/**
 * @param {unknown} style
 * @param {{ userQuestion?: string, transcript?: string, screen?: string }} [intentContext]
 * @returns {string}
 */
function getAnswerStyleSuffix(style, intentContext = {}) {
  const intent = inferResponseIntent(intentContext)
  const isDetailed = normalizeAnswerStyle(style) === 'detailed'
  let base = isDetailed ? DETAILED_ANSWER_RULES : BRIEF_ANSWER_RULES
  if (intent === 'coding') {
    base = `${base}\n\n${CODING_ANSWER_OVERRIDE}`
  }
  const hint = getIntentRoutingHint(intent)
  return `${base}\n\n<intent_routing priority="override">\n${hint}\n</intent_routing>`
}

module.exports = {
  BRIEF_ANSWER_RULES,
  DETAILED_ANSWER_RULES,
  normalizeAnswerStyle,
  getAnswerStyleSuffix,
}
