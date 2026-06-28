// Copyright (c) 2026 VeilAssist. All rights reserved.
// ProfileTreeService-style structured parsing for resume + JD text (no external API).

const SECTION_HEADINGS = [
  { key: 'summary', re: /^(summary|profile|about me|objective|professional summary)\s*:?\s*$/i },
  { key: 'experience', re: /^(experience|work experience|employment|professional experience|career)\s*:?\s*$/i },
  { key: 'education', re: /^(education|academic|qualifications|degrees?)\s*:?\s*$/i },
  { key: 'skills', re: /^(skills|technical skills|core competencies|technologies|expertise)\s*:?\s*$/i },
  { key: 'projects', re: /^(projects|personal projects|key projects)\s*:?\s*$/i },
  { key: 'certifications', re: /^(certifications?|licenses?|credentials?)\s*:?\s*$/i },
]

const JD_SECTION_HEADINGS = [
  { key: 'role', re: /^(role|position|job title|title)\s*:?\s*$/i },
  { key: 'company', re: /^(company|organization|employer)\s*:?\s*$/i },
  { key: 'requirements', re: /^(requirements|qualifications|must have|required)\s*:?\s*$/i },
  { key: 'responsibilities', re: /^(responsibilities|duties|what you('ll| will) do|role overview)\s*:?\s*$/i },
  { key: 'skills', re: /^(skills|technical skills|technologies)\s*:?\s*$/i },
  { key: 'benefits', re: /^(benefits|perks|compensation)\s*:?\s*$/i },
]

/**
 * @param {string} text
 * @param {{ key: string, re: RegExp }[]} headings
 */
function parseSections(text, headings) {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return { sections: {}, plain: '' }

  const lines = raw.split('\n')
  /** @type {Record<string, string[]>} */
  const buckets = {}
  let current = 'body'
  buckets[current] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      buckets[current]?.push('')
      continue
    }
    const hit = headings.find((h) => h.re.test(trimmed))
    if (hit) {
      current = hit.key
      if (!buckets[current]) buckets[current] = []
      continue
    }
    if (!buckets[current]) buckets[current] = []
    buckets[current].push(trimmed)
  }

  /** @type {Record<string, string>} */
  const sections = {}
  for (const [key, arr] of Object.entries(buckets)) {
    const joined = arr.join('\n').trim()
    if (joined) sections[key] = joined
  }

  return { sections, plain: raw }
}

/**
 * @param {string} text
 */
function parseResumeTree(text) {
  const { sections, plain } = parseSections(text, SECTION_HEADINGS)
  const skillsRaw = sections.skills || ''
  const skillsList = skillsRaw
    .split(/[,;|•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 80)

  return {
    kind: 'resume',
    parsedAt: Date.now(),
    sections,
    skillsList,
    charCount: plain.length,
    hasStructure: Object.keys(sections).some((k) => k !== 'body'),
  }
}

/**
 * @param {string} text
 */
function parseJdTree(text) {
  const { sections, plain } = parseSections(text, JD_SECTION_HEADINGS)
  const skillsRaw = sections.skills || sections.requirements || ''
  const skillsList = skillsRaw
    .split(/[,;|•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 60)

  return {
    kind: 'jd',
    parsedAt: Date.now(),
    sections,
    skillsList,
    charCount: plain.length,
    hasStructure: Object.keys(sections).some((k) => k !== 'body'),
  }
}

function tokenizeQuery(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

/**
 * Pick resume/JD sections most relevant to the ask (keyword overlap).
 * @param {ReturnType<typeof parseResumeTree> | ReturnType<typeof parseJdTree> | null | undefined} tree
 * @param {string} query
 * @param {{ maxSections?: number }} [opts]
 */
function selectRelevantSections(tree, query, opts = {}) {
  const maxSections = Math.max(1, Math.min(6, opts.maxSections || 4))
  const sections = tree?.sections || {}
  const keys = Object.keys(sections).filter((k) => String(sections[k] || '').trim())
  if (!keys.length) return sections

  const terms = tokenizeQuery(query)
  if (!terms.length) {
    const fallbackOrder = tree.kind === 'jd'
      ? ['role', 'requirements', 'responsibilities', 'skills', 'company', 'benefits', 'body']
      : ['summary', 'experience', 'skills', 'projects', 'education', 'certifications', 'body']
    const picked = {}
    for (const key of fallbackOrder) {
      if (sections[key]) picked[key] = sections[key]
      if (Object.keys(picked).length >= maxSections) break
    }
    return Object.keys(picked).length ? picked : sections
  }

  const scored = keys.map((key) => {
    const blob = String(sections[key] || '').toLowerCase()
    let score = key === 'experience' || key === 'requirements' ? 0.5 : 0
    for (const t of terms) {
      if (blob.includes(t)) score += 1
    }
    return { key, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const top = scored.filter((s) => s.score > 0).slice(0, maxSections)
  const use = top.length ? top : scored.slice(0, maxSections)
  const picked = {}
  for (const { key } of use) picked[key] = sections[key]
  return picked
}

/**
 * Phase 9 — section-filtered resume block for profileTreeV2.
 */
function formatResumeBlockV2(tree, rawFallback = '', query = '') {
  if (!tree?.sections || !Object.keys(tree.sections).length) {
    return formatResumeBlock(tree, rawFallback)
  }
  const filtered = { ...tree, sections: selectRelevantSections(tree, query, { maxSections: 4 }) }
  return formatResumeBlock(filtered, rawFallback)
}

/**
 * Phase 9 — section-filtered JD block for profileTreeV2.
 */
function formatJdBlockV2(tree, rawFallback = '', query = '') {
  if (!tree?.sections || !Object.keys(tree.sections).length) {
    return formatJdBlock(tree, rawFallback)
  }
  const filtered = { ...tree, sections: selectRelevantSections(tree, query, { maxSections: 4 }) }
  return formatJdBlock(filtered, rawFallback)
}

/** Voice guard injected when profileTreeV2Enabled. */
function buildProfileTreeV2VoiceGuard() {
  return `\n\n---\n## CANDIDATE VOICE (strict)\n- Answer in first person as the candidate ("I", "my experience").\n- Only cite skills, roles, and projects that appear in the RESUME / JOB DESCRIPTION sections above.\n- If the question asks for something not in those sections, say you do not have that in your background — do not invent employers, dates, or metrics.`
}

/**
 * @param {ReturnType<typeof parseResumeTree> | null | undefined} tree
 */
function formatResumeBlock(tree, rawFallback = '') {
  if (!tree?.sections || !Object.keys(tree.sections).length) {
    const raw = String(rawFallback || '').trim()
    return raw ? raw.slice(0, 4000) : ''
  }
  const order = ['summary', 'experience', 'skills', 'projects', 'education', 'certifications', 'body']
  const parts = []
  for (const key of order) {
    const body = tree.sections[key]
    if (!body) continue
    const title = key === 'body' ? 'Background' : key.charAt(0).toUpperCase() + key.slice(1)
    parts.push(`### ${title}\n${body.slice(0, key === 'experience' ? 2200 : 1200)}`)
  }
  return parts.join('\n\n').slice(0, 4500)
}

/**
 * @param {ReturnType<typeof parseJdTree> | null | undefined} tree
 */
function formatJdBlock(tree, rawFallback = '') {
  if (!tree?.sections || !Object.keys(tree.sections).length) {
    const raw = String(rawFallback || '').trim()
    return raw ? raw.slice(0, 3000) : ''
  }
  const order = ['role', 'company', 'responsibilities', 'requirements', 'skills', 'benefits', 'body']
  const parts = []
  for (const key of order) {
    const body = tree.sections[key]
    if (!body) continue
    const title = key === 'body' ? 'Overview' : key.charAt(0).toUpperCase() + key.slice(1)
    parts.push(`### ${title}\n${body.slice(0, 1400)}`)
  }
  return parts.join('\n\n').slice(0, 3500)
}

module.exports = {
  parseResumeTree,
  parseJdTree,
  formatResumeBlock,
  formatJdBlock,
  formatResumeBlockV2,
  formatJdBlockV2,
  selectRelevantSections,
  buildProfileTreeV2VoiceGuard,
}
