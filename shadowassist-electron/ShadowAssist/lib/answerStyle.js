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

const INTERVIEW_ANSWER_RULES = `<answer_format>
Interview mode — you are writing the answer the user will speak aloud during a live interview.

CRITICAL:
- Start IMMEDIATELY with the answer in first person ("I ..."). Zero preamble.
- NEVER say "The interviewer asked..." or "The participant is asking..." — just answer.
- NEVER open with coaching tips or meta-commentary.
- Keep it under 120 words unless the question is deeply technical.
- Behavioral questions: STAR in 4 short sentences (Situation / Task / Action / Result).
- Technical questions: direct answer first, then 2–3 supporting points.
- Write as natural spoken language — the user reads this aloud during the call.
- NO fenced code blocks unless the question explicitly asks for code.
</answer_format>`

const CODING_ANSWER_OVERRIDE = `<coding_answer priority="override">
Coding/implementation question: you MUST include runnable code in a fenced block (e.g. \`\`\`python) along with your explanation. Never use a "Python Code" heading with prose instead of real fenced code.
</coding_answer>`

/** Always included — models sometimes skip conditional intent_routing. */
const CODING_WHEN_ASKED = `<coding_questions>
If the user asks a coding, programming, implementation, debugging, or algorithm question (in speech, typed text, or on screen), include complete runnable code in a fenced markdown block along with your answer — not explanation only.
</coding_questions>`

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
  let base
  if (intent === 'smalltalk') {
    base = '<answer_format>Reply in 1–2 friendly conversational sentences. No headers, no lists, no code. Ignore screen/OCR context entirely.</answer_format>'
  } else if (intent === 'interview') {
    base = INTERVIEW_ANSWER_RULES
  } else if (intent === 'coding') {
    base = isDetailed ? DETAILED_ANSWER_RULES : BRIEF_ANSWER_RULES
    base = `${base}\n\n${CODING_ANSWER_OVERRIDE}`
  } else {
    base = isDetailed ? DETAILED_ANSWER_RULES : BRIEF_ANSWER_RULES
  }
  const hint = getIntentRoutingHint(intent)
  return `${base}\n\n${CODING_WHEN_ASKED}\n\n<intent_routing priority="override">\n${hint}\n</intent_routing>`
}

module.exports = {
  BRIEF_ANSWER_RULES,
  DETAILED_ANSWER_RULES,
  normalizeAnswerStyle,
  getAnswerStyleSuffix,
}
