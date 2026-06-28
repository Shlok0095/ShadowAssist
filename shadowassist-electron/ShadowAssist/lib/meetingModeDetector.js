// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively MeetingModeDetector.ts subset — keyword scoring over live transcript.

const MODE_SIGNALS = [
  {
    template: 'sales',
    label: 'Sales',
    patterns: [
      /\b(pricing|objection|demo|pilot|procurement|roi|competitor|discount|stakeholder|close the deal|upsell)\b/i,
    ],
    weight: 1,
  },
  {
    template: 'recruiting',
    label: 'Recruiting',
    patterns: [
      /\b(candidate|recruit|hiring|offer letter|headcount|pipeline|sourcing|referral|job req)\b/i,
    ],
    weight: 1,
  },
  {
    template: 'looking-for-work',
    label: 'Interview',
    patterns: [
      /\b(tell me about yourself|behavioral|star method|weakness|strength|why should we hire|culture fit)\b/i,
    ],
    weight: 1.2,
  },
  {
    template: 'technical-interview',
    label: 'Technical interview',
    patterns: [
      /\b(leetcode|algorithm|system design|complexity|whiteboard|coding interview|data structure)\b/i,
    ],
    weight: 1.2,
  },
  {
    template: 'lecture',
    label: 'Lecture',
    patterns: [/\b(lecture|syllabus|homework|professor|theorem|exam|assignment|chapter)\b/i],
    weight: 1,
  },
  {
    template: 'team-meet',
    label: 'Team meeting',
    patterns: [
      /\b(standup|sync|retro|blocker|sprint|roadmap|action item|follow up|stakeholder update)\b/i,
    ],
    weight: 0.9,
  },
  {
    template: 'general',
    label: 'Meeting',
    patterns: [/\b(agenda|minutes|next steps|quarter|kickoff|workshop)\b/i],
    weight: 0.5,
  },
]

/**
 * @param {string} text
 */
function scoreTranscript(text) {
  const blob = String(text || '').toLowerCase()
  if (!blob.trim()) return []

  const scored = []
  for (const mode of MODE_SIGNALS) {
    let score = 0
    for (const re of mode.patterns) {
      const m = blob.match(new RegExp(re.source, re.flags + 'g'))
      if (m) score += m.length * mode.weight
    }
    if (score > 0) scored.push({ template: mode.template, label: mode.label, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * @param {string} transcriptBlob
 * @param {{ minScore?: number, minLead?: number }} [opts]
 */
function detectMeetingMode(transcriptBlob, opts = {}) {
  const minScore = opts.minScore ?? 2
  const minLead = opts.minLead ?? 1
  const hits = scoreTranscript(transcriptBlob)
  if (!hits.length) return null

  const top = hits[0]
  const second = hits[1]
  if (top.score < minScore) return null
  if (second && top.score - second.score < minLead) return null

  const confidence = Math.min(0.95, 0.45 + top.score * 0.08)
  return {
    template: top.template,
    label: top.label,
    score: top.score,
    confidence,
    reason: `Detected ${top.label.toLowerCase()} signals in recent speech`,
  }
}

/**
 * @param {Array<{ name?: string, id: string }>} prompts
 * @param {string} template
 */
function findPromptForTemplate(prompts, template) {
  const list = Array.isArray(prompts) ? prompts : []
  const n = String(template || '').toLowerCase()

  const byName = list.find((p) => {
    const name = String(p.name || '').toLowerCase()
    if (n === 'sales') return /\bsales\b/.test(name)
    if (n === 'recruiting') return /recruit|hiring|candidate/.test(name)
    if (n === 'lecture') return /lecture|class|course|training/.test(name)
    if (n === 'team-meet') return /team meet|standup|sync|retro/.test(name) || (/\bmeeting\b/.test(name) && !/sales|recruit|lecture/.test(name))
    if (n === 'technical-interview') {
      return /technical|coding|system design|gen ai|data science|engineer|leetcode/.test(name)
    }
    if (n === 'looking-for-work') {
      return /looking for work|interviewee|job interview/.test(name) || (/\binterview\b/.test(name) && !/recruit|technical|coding/.test(name))
    }
    if (n === 'general') return /\bgeneral\b/.test(name)
    return false
  })
  return byName || null
}

/** Maps detector template → starter template id in modeTemplates.js */
const TEMPLATE_TO_STARTER_ID = {
  sales: 'tmpl-sales',
  recruiting: 'tmpl-recruiting',
  'looking-for-work': 'tmpl-interview',
  'technical-interview': 'tmpl-gen-ai',
  lecture: 'tmpl-lecture',
  'team-meet': 'tmpl-meeting',
  general: 'tmpl-general',
}

/**
 * Create a context prompt from MODE_TEMPLATES when none exists for this detector hit.
 * @param {string} template
 * @param {Array<object>} prompts
 * @returns {object | null}
 */
function buildPromptFromStarterTemplate(template, prompts) {
  const { MODE_TEMPLATES } = require('./modeTemplates.cjs')
  const starterId = TEMPLATE_TO_STARTER_ID[template]
  if (!starterId) return null
  const tmpl = MODE_TEMPLATES.find((t) => t.id === starterId)
  if (!tmpl) return null

  const existing = findPromptForTemplate(prompts, template)
  if (existing) return existing

  const now = Date.now()
  const noteSections = (tmpl.notesTemplate || []).map((s, i) => ({
    id: `ns-${now}-${i}`,
    title: String(s.title || 'Section').slice(0, 80),
    instructions: String(s.instructions || '').slice(0, 400),
  }))

  return {
    id: `cp-auto-${template}-${now}`,
    name: tmpl.name,
    content: String(tmpl.content || '').slice(0, 12000),
    referenceFiles: [],
    notesTemplate: { sections: noteSections },
    createdAt: now,
    updatedAt: now,
    autoProvisioned: true,
  }
}

module.exports = {
  detectMeetingMode,
  findPromptForTemplate,
  buildPromptFromStarterTemplate,
  scoreTranscript,
  MODE_SIGNALS,
  TEMPLATE_TO_STARTER_ID,
}
