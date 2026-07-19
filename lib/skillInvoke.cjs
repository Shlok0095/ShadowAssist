// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 5 — parse `/skill-name` prefix from typed overlay input.

const SKILL_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/

/**
 * @param {string | null | undefined} raw
 * @returns {{ skillSlug: string, question: string } | null}
 */
function parseSkillInvoke(raw) {
  const t = String(raw || '').trim()
  if (!t.startsWith('/')) return null
  const m = t.match(/^\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,47})(?:\s+(.*))?$/s)
  if (!m) return null
  const skillSlug = m[1].toLowerCase()
  if (!SKILL_SLUG_RE.test(skillSlug)) return null
  return { skillSlug, question: String(m[2] || '').trim() }
}

/**
 * @param {string} slug
 */
function normalizeSkillSlug(slug) {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return SKILL_SLUG_RE.test(s) ? s : ''
}

module.exports = { parseSkillInvoke, normalizeSkillSlug, SKILL_SLUG_RE }
