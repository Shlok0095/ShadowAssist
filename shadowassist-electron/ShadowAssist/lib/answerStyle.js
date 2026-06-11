// Copyright (c) 2026 ShadowAssist. All rights reserved.

/** @typedef {'brief' | 'detailed'} AnswerStyle */

const BRIEF_ANSWER_RULES = `<answer_format>
Meeting-style replies — substantive depth, optimized for reading during a live call:
1. Open with a **Takeaway** (2–3 sentences: what to say first + the core point). Use **Takeaway:** or ## Takeaway.
2. Follow with **4–6 substantial paragraphs** of explanation (roughly 200–500 words). Cover why, how, tradeoffs, and what to emphasize aloud. Write in connected prose — not bullet dumps.
3. For coding or technical questions: after the explanation, put the **full solution in fenced code blocks in the main answer** (not hidden, not under a Details section). Add brief inline comments in code when helpful.
4. Use bullets or numbered steps ONLY when the user explicitly asks for a list, steps, options, or comparison — tuck those under ## Details after a horizontal rule (---).
5. Skip filler ("Sure!", "Here's a summary", "Let me help").
Never bury code under Details. Lists and optional UI click-steps may go under ## Details only.
</answer_format>`

const DETAILED_ANSWER_RULES = `<answer_format>
Use clear markdown structure (headings, lists, code blocks) when it helps. Lead with the direct answer, then explain.
</answer_format>`

/**
 * @param {unknown} style
 * @returns {AnswerStyle}
 */
function normalizeAnswerStyle(style) {
  return style === 'detailed' ? 'detailed' : 'brief'
}

/**
 * Appended to the system prompt on each ask (does not replace the base prompt).
 * @param {unknown} style
 * @returns {string}
 */
function getAnswerStyleSuffix(style) {
  return normalizeAnswerStyle(style) === 'detailed' ? DETAILED_ANSWER_RULES : BRIEF_ANSWER_RULES
}

module.exports = {
  BRIEF_ANSWER_RULES,
  DETAILED_ANSWER_RULES,
  normalizeAnswerStyle,
  getAnswerStyleSuffix,
}
