// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively-style meeting recap formatting — strict ## headings, hyphen bullets, omit empty sections.

const MEETING_SUMMARY_FORMAT_RULES = `OUTPUT FORMAT (strict — Natively / Cluely-style recap):
- Section headings: use "## Section name" on its own line only. Never use **Bold** as a section title.
- Bullets: hyphen only ("- item"). Never use asterisk bullets (*).
- Overview: 1–2 plain sentences (prose paragraph). No bullet list under Overview unless truly necessary.
- Key points: tight factual bullets; one idea per line; lead with the subject.
- Decisions / Action items / Open questions: include ONLY when the transcript supports them.
- Never write filler such as "No explicit decisions", "None mentioned", "No action items" — omit the entire section instead.
- No preamble ("Here is a summary", "Based on the transcript").
- Professional neutral tone. Max one short bold phrase per bullet only for names or dates if needed.
- Markdown only. Under 900 words.`

const EMPTY_LINE_PATTERNS = [
  /^no\s+(explicit|specific|clear|further|action|decisions?|items?|questions?)/i,
  /^none(\s+(mentioned|identified|stated|noted))?\.?$/i,
  /^not\s+(mentioned|discussed|stated|applicable)/i,
  /^n\/a\.?$/i,
  /^-$/,
  /^\*?\s*no\s+/i,
]

/**
 * Normalize LLM markdown to consistent recap shape for storage + UI render.
 * @param {string} text
 * @returns {string}
 */
function normalizeMeetingSummaryMarkdown(text) {
  let raw = String(text || '').trim()
  if (!raw) return raw

  const lines = []
  for (let line of raw.split('\n')) {
    const trimmed = line.trimEnd()
    const boldOnly = trimmed.match(/^\*\*([^*]+)\*\*:?\s*$/)
    if (boldOnly) {
      lines.push(`## ${boldOnly[1].trim()}`)
      continue
    }
    if (/^\*\s+/.test(trimmed)) {
      lines.push(trimmed.replace(/^\*\s+/, '- '))
      continue
    }
    if (/^#{3,}\s+/.test(trimmed)) {
      lines.push(trimmed.replace(/^#{3,}\s+/, '## '))
      continue
    }
    lines.push(trimmed)
  }

  return stripEmptySections(lines.join('\n'))
}

/**
 * @param {string} md
 */
function stripEmptySections(md) {
  /** @type {{ heading: string | null, body: string[] }[]} */
  const blocks = []
  let cur = { heading: null, body: [] }

  const pushBlock = () => {
    if (cur.heading || cur.body.some((l) => l.trim())) blocks.push(cur)
    cur = { heading: null, body: [] }
  }

  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+(.+)$/)
    if (h) {
      pushBlock()
      cur.heading = h[1].trim()
    } else {
      cur.body.push(line)
    }
  }
  pushBlock()

  const kept = blocks.filter((b) => {
    const contentLines = b.body.map((l) => l.trim()).filter(Boolean)
    if (!contentLines.length) return false
    const onlyEmptyBullets = contentLines.every((l) => {
      const bullet = l.replace(/^-\s*/, '').trim()
      if (!bullet) return true
      return EMPTY_LINE_PATTERNS.some((re) => re.test(bullet))
    })
    return !onlyEmptyBullets
  })

  const parts = []
  for (const b of kept) {
    if (b.heading) parts.push(`## ${b.heading}`)
    parts.push(...b.body)
    parts.push('')
  }
  return parts.join('\n').trim()
}

module.exports = {
  MEETING_SUMMARY_FORMAT_RULES,
  normalizeMeetingSummaryMarkdown,
  stripEmptySections,
}
