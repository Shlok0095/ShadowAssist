import type { AppSettings, PersonalProfile } from './profileTypes'
import { DEFAULT_PROFILE } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'

import { getChatBaseUrl } from './providerRegistry'
import { applyNemotronReasoning, nvidiaChatHeaders } from './nvidiaChatHelpers'

const CV_SYSTEM_PROMPT = `You extract resume/CV text into structured JSON for an interview assistant.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "name": "string",
  "summary": "string — professional summary",
  "experience": [{ "title": "string", "company": "string", "dateRange": "string", "bullets": "string — bullet points joined with newlines" }],
  "skills": ["string"],
  "projects": [{ "name": "string", "tech": "string", "description": "string" }],
  "education": [{ "degree": "string", "details": "string" }]
}
Rules:
- Extract deeply: every job, project, skill, and degree you can find.
- Split skills into individual tags (Python, PyTorch, etc.) — not one blob.
- Preserve metrics and facts in bullets/descriptions.
- Never invent employers, dates, or achievements not in the source text.
- Do not include a separate "extra context" field — the user adds that manually in the app.
- Use empty strings or empty arrays when a section is missing.`

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
    skills: [...new Set((raw.skills || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 120),
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
    extraContext: '',
    rawText: rawText.slice(0, 50000),
    sourceFileName,
    updatedAt: Date.now(),
  }
}

function stripJsonFence(text: string): string {
  const raw = String(text || '').trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return raw.slice(start, end + 1)
  return raw
}

async function structureCvDirect(
  rawText: string,
  settings: AppSettings,
  sourceFileName?: string,
): Promise<PersonalProfile> {
  const apiKey = getActiveApiKey(settings)
  if (!apiKey) throw new Error('API key required for deep CV extraction')

  const model = getActiveModel(settings)
  const base = getChatBaseUrl(settings, settings.provider)
  const clipped = rawText.slice(0, 14000)

  const payload: Record<string, unknown> = {
    model,
    messages: applyNemotronReasoning(
      [
        { role: 'system', content: CV_SYSTEM_PROMPT },
        { role: 'user', content: `Extract structured profile from this CV/resume text:\n\n${clipped}` },
      ],
      base,
      model,
      false,
    ),
    max_tokens: 4000,
    temperature: 0,
    top_p: 0.7,
    stream: false,
  }

  if (/nemotron/i.test(model)) {
    payload.chat_template_kwargs = { enable_thinking: false }
  }

  if (settings.provider === 'openai' || settings.provider === 'groq') {
    payload.response_format = { type: 'json_object' }
  }

  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: nvidiaChatHeaders(apiKey),
      body: JSON.stringify(payload),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|network|load/i.test(msg)) {
      throw new Error(`Could not reach ${settings.provider} API for CV extraction. Check connection and API key.`)
    }
    throw e
  }

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`CV extraction failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = JSON.parse(text)
  const content = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!content) throw new Error('Empty CV extraction response')

  const parsed = JSON.parse(stripJsonFence(content)) as RawStructured
  return mapLlmProfile(parsed, rawText, sourceFileName)
}

export async function structureCvWithLlm(
  rawText: string,
  settings: AppSettings,
  sourceFileName?: string,
): Promise<PersonalProfile> {
  if (import.meta.env.VITE_MOBILE_APK) {
    return structureCvDirect(rawText, settings, sourceFileName)
  }

  const origin = String(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')
  const url = origin ? `${origin}/api/interview/structure-cv` : '/api/interview/structure-cv'

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
