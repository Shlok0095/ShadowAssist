import type { PersonalProfile } from './profileTypes'

const ROLE_WORD =
  /\b(engineer|scientist|developer|analyst|architect|specialist|researcher|intern|manager|lead|consultant|designer)\b/i

function domainSpecialty(profile: PersonalProfile): string | null {
  const text = [
    profile.summary,
    profile.skills.join(' '),
    ...profile.projects.map((p) => `${p.tech} ${p.description}`),
  ].join(' ')
  if (/\bllms?\b|large language model/i.test(text)) return 'LLMs'
  if (/\bnlp\b|natural language/i.test(text)) return 'NLP'
  if (/generative ai|\bgenai\b/i.test(text)) return 'Generative AI'
  if (/computer vision/i.test(text)) return 'computer vision'
  if (/machine learning|\bml\b/i.test(text)) return 'machine learning'
  if (/data scien/i.test(text)) return 'data science'
  return null
}

/** Role identity from the summary headline — not the latest job title + first tool. */
function roleFromSummary(summary: string): string {
  const s = summary.replace(/\s+/g, ' ').trim()
  if (!s) return ''
  let head = (s.split(/[.!?]/)[0] || s).trim()
  head = head.split(/\bwith\b/i)[0].trim()
  head = head.replace(/[,:;]+$/g, '').trim()
  const parts = head.split(/\s+and\s+/i)
  if (parts.length > 1 && ROLE_WORD.test(parts[0]) && parts[0].trim().length <= 48) {
    return parts[0].trim()
  }
  if (head.length <= 90) return head
  return head.slice(0, 90).trim()
}

export function deriveInterviewTopic(profile: PersonalProfile): string {
  const fromSummary = roleFromSummary(profile.summary)
  const latest = profile.experience.find((e) => e.title.trim())
  const role = fromSummary || latest?.title.trim() || ''
  if (!role) return ''

  const specialty = domainSpecialty(profile)
  if (specialty && !new RegExp(specialty.replace(/\s+/g, '\\s+'), 'i').test(role)) {
    return `${role} specializing in ${specialty}`
  }
  return role
}
