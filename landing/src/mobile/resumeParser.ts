import type { Education, PersonalProfile, Project, WorkExperience } from './profileTypes'
import { DEFAULT_PROFILE } from './profileTypes'

const SECTION_HEADINGS = [
  { key: 'summary', re: /^(summary|profile|about me|objective|professional summary)\s*:?\s*$/i },
  { key: 'experience', re: /^(experience|work experience|employment|professional experience|career)\s*:?\s*$/i },
  { key: 'education', re: /^(education|academic|qualifications|degrees?)\s*:?\s*$/i },
  { key: 'skills', re: /^(skills|technical skills|core competencies|technologies|expertise)\s*:?\s*$/i },
  { key: 'projects', re: /^(projects|personal projects|key projects)\s*:?\s*$/i },
]

const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}|present)/i

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function parseSections(text: string): Record<string, string> {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return {}

  const lines = raw.split('\n')
  const buckets: Record<string, string[]> = { body: [] }
  let current = 'body'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      buckets[current]?.push('')
      continue
    }
    const hit = SECTION_HEADINGS.find((h) => h.re.test(trimmed))
    if (hit) {
      current = hit.key
      if (!buckets[current]) buckets[current] = []
      continue
    }
    if (!buckets[current]) buckets[current] = []
    buckets[current].push(trimmed)
  }

  const sections: Record<string, string> = {}
  for (const [key, arr] of Object.entries(buckets)) {
    const joined = arr.join('\n').trim()
    if (joined) sections[key] = joined
  }
  return sections
}

function splitSkills(text: string): string[] {
  return text
    .split(/[,;|•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 120)
}

function parseExperienceBlock(text: string): WorkExperience[] {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim())
  const items: WorkExperience[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue

    let title = ''
    let company = ''
    let dateRange = ''
    const bulletLines: string[] = []

    const first = lines[0]
    const dateMatch = first.match(DATE_RANGE_RE)
    if (dateMatch) dateRange = dateMatch[0]

    const atSplit = first.split(/\s+at\s+/i)
    if (atSplit.length >= 2) {
      title = atSplit[0].replace(DATE_RANGE_RE, '').trim()
      company = atSplit.slice(1).join(' at ').replace(DATE_RANGE_RE, '').trim()
    } else {
      title = first.replace(DATE_RANGE_RE, '').trim()
    }

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i]
      if (DATE_RANGE_RE.test(line) && !dateRange) {
        dateRange = line.match(DATE_RANGE_RE)?.[0] || line
        continue
      }
      bulletLines.push(line.replace(/^[-•*]\s*/, ''))
    }

    if (title || company || bulletLines.length) {
      items.push({
        id: uid(),
        title,
        company,
        dateRange,
        bullets: bulletLines.join('\n'),
      })
    }
  }

  if (!items.length && text.trim()) {
    items.push({ id: uid(), title: '', company: '', dateRange: '', bullets: text.trim() })
  }
  return items.slice(0, 20)
}

function parseProjectsBlock(text: string): Project[] {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim())
  const items: Project[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    const first = lines[0]
    const parenMatch = first.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    const name = parenMatch ? parenMatch[1].trim() : first
    const tech = parenMatch ? parenMatch[2].trim() : ''
    const description = lines.slice(1).join('\n')
    items.push({ id: uid(), name, tech, description })
  }
  return items.slice(0, 20)
}

function parseEducationBlock(text: string): Education[] {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim())
  return blocks.slice(0, 12).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    return {
      id: uid(),
      degree: lines[0] || '',
      details: lines.slice(1).join('\n'),
    }
  })
}

function guessName(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 60) continue
    if (SECTION_HEADINGS.some((h) => h.re.test(line))) continue
    if (/[@#]|https?:|linkedin|github|phone|email/i.test(line)) continue
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line)) return line
  }
  return ''
}

export function structureResumeText(text: string, sourceFileName?: string): PersonalProfile {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return { ...DEFAULT_PROFILE, sourceFileName }

  const sections = parseSections(raw)
  const summary = sections.summary || sections.body?.split('\n\n').slice(0, 2).join('\n') || ''
  const experience = parseExperienceBlock(sections.experience || '')
  const skills = splitSkills(sections.skills || '')
  const projects = parseProjectsBlock(sections.projects || '')
  const education = parseEducationBlock(sections.education || '')

  return {
    ...DEFAULT_PROFILE,
    name: guessName(raw),
    summary: summary.slice(0, 4000),
    experience,
    skills,
    projects,
    education,
    rawText: raw.slice(0, 50000),
    sourceFileName,
    updatedAt: Date.now(),
  }
}
