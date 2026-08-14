import type { AppSettings, PersonalProfile } from './profileTypes'
import { DEFAULT_PROFILE } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

type RawStructured = {
  name?: string
  summary?: string
  experience?: Array<{
    title?: string
    company?: string
    dateRange?: string
    bullets?: string
  }>
  skills?: string[]
  projects?: Array<{ name?: string; tech?: string; description?: string }>
  education?: Array<{ degree?: string; details?: string }>
  extraContext?: string
}

export function mapLlmProfile(raw: RawStructured, rawText: string, sourceFileName?: string): PersonalProfile {
  return {
    ...DEFAULT_PROFILE,
    name: String(raw.name || '').trim(),
    summary: String(raw.summary || '').trim(),
    experience: (raw.experience || []).map((e) => ({
      id: uid(),
      title: String(e.title || '').trim(),
      company: String(e.company || '').trim(),
      dateRange: String(e.dateRange || '').trim(),
      bullets: String(e.bullets || '').trim(),
    })),
    skills: (raw.skills || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 120),
    projects: (raw.projects || []).map((p) => ({
      id: uid(),
      name: String(p.name || '').trim(),
      tech: String(p.tech || '').trim(),
      description: String(p.description || '').trim(),
    })),
    education: (raw.education || []).map((e) => ({
      id: uid(),
      degree: String(e.degree || '').trim(),
      details: String(e.details || '').trim(),
    })),
    extraContext: String(raw.extraContext || '').trim(),
    rawText: rawText.slice(0, 50000),
    sourceFileName,
    updatedAt: Date.now(),
  }
}

export async function structureCvWithLlm(
  rawText: string,
  settings: AppSettings,
  sourceFileName?: string,
): Promise<PersonalProfile> {
  const origin = String(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')
  const url =
    origin
      ? `${origin}/api/interview/structure-cv`
      : import.meta.env.VITE_MOBILE_APK
        ? 'https://veilassist.vercel.app/api/interview/structure-cv'
        : '/api/interview/structure-cv'

  const apiKey = getActiveApiKey(settings)
  if (!apiKey) throw new Error('API key required for deep CV extraction')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText,
      provider: settings.provider,
      apiKey,
      model: getActiveModel(settings),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.detail || `Structure failed (${res.status})`)
  }

  return mapLlmProfile(data.profile as RawStructured, rawText, sourceFileName)
}
