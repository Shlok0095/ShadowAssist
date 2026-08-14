import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileToContextText } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'
import { buildChatPayload } from './promptBuilder'
import { getChatBaseUrl, getChatProviderMeta } from './providerRegistry'

/** Direct provider call — same as desktop app (no Vercel proxy / no CORS issues in APK). */
export async function requestInterviewAnswerDirect(params: {
  question: string
  profile: PersonalProfile
  settings: AppSettings
  think: boolean
  source?: 'manual_input' | 'transcript'
}): Promise<string> {
  const apiKey = getActiveApiKey(params.settings)
  if (!apiKey) throw new Error('Add your API key in Settings → AI Providers.')

  const model = getActiveModel(params.settings)
  const profileText = profileToContextText(params.profile)
  const jobDescription = params.profile.jobDescription || params.settings.interviewTopic
  const meta = getChatProviderMeta(params.settings.provider)

  const { payload, systemPrompt } = buildChatPayload({
    question: params.question,
    profileText,
    jobDescription,
    settings: params.settings,
    think: params.think,
    source: params.source,
    model,
  })

  if (meta.kind === 'anthropic') {
    return requestAnthropic({ apiKey, model, systemPrompt, question: params.question, payload })
  }

  const base = getChatBaseUrl(params.settings, params.settings.provider)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (params.settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://veilassist.vercel.app'
    headers['X-Title'] = 'VeilAssist Interview'
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  if (!res.ok) {
    let detail = text.slice(0, 300)
    try {
      const parsed = JSON.parse(text)
      detail = parsed?.error?.message || parsed?.error || detail
    } catch {
      /* keep raw */
    }
    throw new Error(`AI provider error (${res.status}): ${detail}`)
  }

  const data = JSON.parse(text)
  const answer = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!answer) throw new Error('Empty response from AI provider')
  return answer
}

async function requestAnthropic(input: {
  apiKey: string
  model: string
  systemPrompt: string
  question: string
  payload: Record<string, unknown>
}): Promise<string> {
  const maxTokens = Number(input.payload.max_tokens) || 2048
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: maxTokens,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: input.question }],
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    let detail = text.slice(0, 300)
    try {
      const parsed = JSON.parse(text)
      detail = parsed?.error?.message || detail
    } catch {
      /* keep raw */
    }
    throw new Error(`Anthropic error (${res.status}): ${detail}`)
  }

  const data = JSON.parse(text)
  const answer = data?.content?.find((c: { type?: string }) => c.type === 'text')?.text?.trim() || ''
  if (!answer) throw new Error('Empty response from Anthropic')
  return answer
}
