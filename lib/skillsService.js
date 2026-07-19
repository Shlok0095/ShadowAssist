// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 5 — local skills under userData/skills/<slug>/SKILL.md

const fs = require('fs')
const path = require('path')
const { normalizeSkillSlug } = require('./skillInvoke.cjs')

const META_FILE = 'meta.json'
const BODY_FILE = 'SKILL.md'
const MAX_BODY_CHARS = 24000

/**
 * @param {{ skillsRoot: string }} opts
 */
function createSkillsService({ skillsRoot }) {
  function ensureRoot() {
    if (!fs.existsSync(skillsRoot)) fs.mkdirSync(skillsRoot, { recursive: true })
  }

  function skillDir(slug) {
    return path.join(skillsRoot, slug)
  }

  function readMeta(slug) {
    try {
      const p = path.join(skillDir(slug), META_FILE)
      if (!fs.existsSync(p)) return {}
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      return {}
    }
  }

  function readBody(slug) {
    try {
      const p = path.join(skillDir(slug), BODY_FILE)
      if (!fs.existsSync(p)) return ''
      return String(fs.readFileSync(p, 'utf8') || '').slice(0, MAX_BODY_CHARS)
    } catch {
      return ''
    }
  }

  function list() {
    ensureRoot()
    let entries = []
    try {
      entries = fs.readdirSync(skillsRoot, { withFileTypes: true })
    } catch {
      return []
    }
    const out = []
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const slug = ent.name
      if (!normalizeSkillSlug(slug)) continue
      const meta = readMeta(slug)
      const body = readBody(slug)
      out.push({
        slug,
        name: String(meta.name || slug).slice(0, 80),
        description: String(meta.description || '').slice(0, 240),
        updatedAt: Number(meta.updatedAt) || 0,
        hasBody: !!body.trim(),
      })
    }
    out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || a.slug.localeCompare(b.slug))
    return out
  }

  function get(slug) {
    const id = normalizeSkillSlug(slug)
    if (!id) return null
    const dir = skillDir(id)
    if (!fs.existsSync(dir)) return null
    const meta = readMeta(id)
    const body = readBody(id)
    return {
      slug: id,
      name: String(meta.name || id).slice(0, 80),
      description: String(meta.description || '').slice(0, 240),
      body,
      updatedAt: Number(meta.updatedAt) || 0,
    }
  }

  /**
   * @param {string} slug
   * @param {{ name?: string, description?: string, body?: string }} patch
   */
  function save(slug, patch = {}) {
    const id = normalizeSkillSlug(slug)
    if (!id) return { ok: false, error: 'Invalid skill name — use letters, numbers, and hyphens.' }
    ensureRoot()
    const dir = skillDir(id)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const prev = get(id)
    const name = String(patch.name ?? prev?.name ?? id).trim().slice(0, 80) || id
    const description = String(patch.description ?? prev?.description ?? '').trim().slice(0, 240)
    const body = String(patch.body ?? prev?.body ?? '').slice(0, MAX_BODY_CHARS)
    const updatedAt = Date.now()

    fs.writeFileSync(path.join(dir, META_FILE), JSON.stringify({ name, description, updatedAt }, null, 2), 'utf8')
    fs.writeFileSync(path.join(dir, BODY_FILE), body, 'utf8')

    return { ok: true, skill: get(id) }
  }

  function remove(slug) {
    const id = normalizeSkillSlug(slug)
    if (!id) return { ok: false, error: 'Invalid skill name' }
    const dir = skillDir(id)
    if (!fs.existsSync(dir)) return { ok: false, error: 'Skill not found' }
    fs.rmSync(dir, { recursive: true, force: true })
    return { ok: true }
  }

  /**
   * @param {string} slug
   * @returns {string} System prompt suffix, or empty.
   */
  function buildSkillBlock(slug) {
    const skill = get(slug)
    if (!skill?.body?.trim()) return ''
    const title = skill.name || skill.slug
    return `\n\n---\n## Active skill: ${title}\n${skill.body.trim()}`
  }

  return { list, get, save, remove, buildSkillBlock, skillsRoot }
}

/** Starter templates (not auto-installed — user picks in settings). */
const STARTER_SKILLS = [
  {
    slug: 'interview',
    name: 'Interview coach',
    description: 'Structured help for technical and behavioral interview answers.',
    body: `You are an interview coach. Keep answers speakable in 2–4 sentences unless the user asks for depth.
- Prefer STAR format for behavioral questions.
- For technical questions: clarify assumptions, outline approach, then give a concise answer.
- Flag red flags politely and suggest stronger phrasing.`,
  },
  {
    slug: 'sales',
    name: 'Sales call',
    description: 'Discovery, objection handling, and next-step clarity.',
    body: `You are a sales copilot on a live call. Be concise and speakable.
- Mirror the prospect's language.
- Surface pain, impact, and decision process when relevant.
- Suggest one clear next step; avoid pushy closing language.`,
  },
]

module.exports = { createSkillsService, STARTER_SKILLS, MAX_BODY_CHARS }
