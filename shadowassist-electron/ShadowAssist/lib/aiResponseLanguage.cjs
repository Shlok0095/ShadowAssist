// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 3 — optional reply language appended to system prompt (Natively-style).

/** @type {{ id: string, label: string }[]} */
const AI_RESPONSE_LANGUAGES = [
  { id: '', label: 'Match my question (default)' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'ja', label: 'Japanese' },
  { id: 'zh', label: 'Chinese' },
]

const LABEL_BY_ID = Object.fromEntries(AI_RESPONSE_LANGUAGES.map((o) => [o.id, o.label]))

/**
 * @param {string | null | undefined} raw
 * @returns {string} System prompt suffix, or empty.
 */
function buildAiResponseLanguageBlock(raw) {
  const id = String(raw || '').trim().toLowerCase()
  if (!id) return ''
  const label = LABEL_BY_ID[id] || id
  return `\n\n---\nRespond in ${label}. Match the user's language when set to default; otherwise use ${label} for all assistant replies.`
}

function listAiResponseLanguages() {
  return AI_RESPONSE_LANGUAGES.slice()
}

module.exports = {
  AI_RESPONSE_LANGUAGES,
  buildAiResponseLanguageBlock,
  listAiResponseLanguages,
}
