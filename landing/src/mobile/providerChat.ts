import type { AppSettings, PersonalProfile } from './profileTypes'
import { profileToContextText } from './profileTypes'
import { getActiveApiKey, getActiveModel } from './profileStorage'
import { buildChatPayload } from './promptBuilder'
import { getChatBaseUrl, getChatProviderMeta } from './providerRegistry'
import { applyNemotronReasoning, nvidiaChatHeaders } from './nvidiaChatHelpers'
import { isLikelyCorsOrNetworkError, mobileApiPost } from './mobileHttp'
import type { SessionTurn } from './sessionLoopTypes'

const NVIDIA_CHAT_FALLBACK = 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1'
const REQUEST_TIMEOUT_MS = 20000

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && e.message === 'REQUEST_TIMEOUT'
}

async function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true })
    promise
      .then((v) => {
        clearTimeout(timer)
        if (signal) signal.removeEventListener('abort', onAbort)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        if (signal) signal.removeEventListener('abort', onAbort)
        reject(e)
      })
  })
}

/** Direct provider call — same as desktop app (no Vercel proxy / no CORS issues in APK). */
export async function requestInterviewAnswerDirect(params: {
  question: string
  profile: PersonalProfile
  settings: AppSettings
  think: boolean
  source?: 'manual_input' | 'transcript'
  turnHistory?: SessionTurn[]
  signal?: AbortSignal
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
    turnHistory: params.turnHistory,
  })

  if (meta.kind === 'anthropic') {
    return requestAnthropic({
      apiKey,
      model,
      systemPrompt,
      question: params.question,
      payload,
      signal: params.signal,
    })
  }

  const base = getChatBaseUrl(params.settings, params.settings.provider)
  const headers: Record<string, string> = {
    ...nvidiaChatHeaders(apiKey),
  }
  if (params.settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://veilassist.vercel.app'
    headers['X-Title'] = 'VeilAssist Interview'
  }

  const messages = applyNemotronReasoning(
    payload.messages as Array<{ role: string; content: string }>,
    base,
    model,
    params.think,
  )

  const requestBody = { ...payload, messages }

  const doRequest = async (activeModel: string) => {
    const body = {
      ...requestBody,
      model: activeModel,
      messages: applyNemotronReasoning(
        payload.messages as Array<{ role: string; content: string }>,
        base,
        activeModel,
        params.think,
      ),
    }
    try {
      return await withTimeout(
        mobileApiPost(`${base}/chat/completions`, headers, body),
        REQUEST_TIMEOUT_MS,
        params.signal,
      )
    } catch (e) {
      if (isAbortError(e)) throw e
      const msg = e instanceof Error ? e.message : String(e)
      if (isTimeoutError(e)) throw e
      if (isLikelyCorsOrNetworkError(msg) && params.settings.provider === 'nvidia') {
        throw new Error(
          `NVIDIA NIM blocked by browser CORS from the app shell. Reinstall the latest APK (1.2.1+) or switch to Groq in Settings → AI Providers. (${msg})`,
        )
      }
      if (isLikelyCorsOrNetworkError(msg)) {
        throw new Error(
          `Could not reach ${params.settings.provider} API. Check internet connection and API key. (${msg})`,
        )
      }
      throw e
    }
  }

  let activeModel = model
  let res: { status: number; text: string; ok: boolean }

  try {
    res = await doRequest(activeModel)
  } catch (e) {
    if (isTimeoutError(e)) {
      res = await doRequest(activeModel)
    } else {
      throw e
    }
  }

  if (
    !res.ok &&
    params.settings.provider === 'nvidia' &&
    activeModel !== NVIDIA_CHAT_FALLBACK &&
    (res.status >= 500 || res.status === 404)
  ) {
    activeModel = NVIDIA_CHAT_FALLBACK
    res = await doRequest(activeModel)
  }

  if (!res.ok && res.status >= 500) {
    res = await doRequest(activeModel)
  }

  const text = res.text
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

/** Minimal chat request to validate API key before session starts. */
export async function validateProviderKeyDirect(settings: AppSettings): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getActiveApiKey(settings)
  if (!apiKey) return { ok: false, error: 'Add your API key in Settings → AI Providers.' }

  const model = getActiveModel(settings)
  const meta = getChatProviderMeta(settings.provider)
  if (meta.kind === 'anthropic') {
    try {
      const res = await withTimeout(
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 8,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        }),
        REQUEST_TIMEOUT_MS,
      )
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: `Invalid API key for ${settings.provider}. Check Settings → AI Providers.` }
      }
      if (!res.ok) {
        const t = await res.text()
        return { ok: false, error: `API validation failed (${res.status}): ${t.slice(0, 120)}` }
      }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'API key validation failed'
      return { ok: false, error: msg }
    }
  }

  const base = getChatBaseUrl(settings, settings.provider)
  const headers: Record<string, string> = { ...nvidiaChatHeaders(apiKey) }
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://veilassist.vercel.app'
    headers['X-Title'] = 'VeilAssist Interview'
  }

  try {
    const res = await withTimeout(
      mobileApiPost(`${base}/chat/completions`, headers, {
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
        temperature: 0,
      }),
      REQUEST_TIMEOUT_MS,
    )
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: `Invalid API key for ${settings.provider}. Check Settings → AI Providers.` }
    }
    if (!res.ok) {
      return { ok: false, error: `API validation failed (${res.status}): ${res.text.slice(0, 120)}` }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'API key validation failed'
    if (isLikelyCorsOrNetworkError(msg)) {
      return { ok: false, error: `Could not reach ${settings.provider} API. Check internet and API key.` }
    }
    return { ok: false, error: msg }
  }
}

async function requestAnthropic(input: {
  apiKey: string
  model: string
  systemPrompt: string
  question: string
  payload: Record<string, unknown>
  signal?: AbortSignal
}): Promise<string> {
  const maxTokens = Number(input.payload.max_tokens) || 2048
  const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
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
    signal: input.signal,
  })

  const res = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS, input.signal)
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
