import {
  canAttempt,
  circuitId,
  getCircuitState,
  recordFailure,
  recordSuccess,
} from './circuitBreaker'
import { FALLBACK_RANK } from './generated/fallbackRank.generated'
import { capabilitiesFor } from './modelCapabilityRegistry'
import { formatCheckedModelsError } from './modelDisplay'
import type { AppSettings } from './profileTypes'
import { getProviderApiKey } from './providerRegistry'
import { recordHealth, sortTargetsByHealth } from './runtimeHealth'

export const THINKING_TEMPERATURE = 0.6
export const NORMAL_TEMPERATURE = 0

export type FallbackReason =
  | 'success'
  | 'timeout'
  | 'http_5xx'
  | 'http_429'
  | 'network'
  | 'empty'
  | 'circuit_open'
  | 'not_multimodal'
  | 'auth'
  | 'model_unavailable'

export type FallbackHop = {
  provider: 'nvidia' | 'groq'
  model: string
  reason: FallbackReason
  latencyMs?: number
}

export type FallbackEvent = {
  requestId: string
  mode: 'normal' | 'thinking'
  requestedProvider: string
  requestedModel: string
  actualProvider: string
  actualModel: string
  fallbackTriggered: boolean
  fallbackReason: FallbackReason
  retryCount: number
  temperature: number
  reasoningEnabled: boolean
  hops: FallbackHop[]
  hasImage: boolean
}

const recentEvents: FallbackEvent[] = []

export function getRecentFallbackEvents(): FallbackEvent[] {
  return [...recentEvents]
}

function pushEvent(ev: FallbackEvent): void {
  recentEvents.unshift(ev)
  if (recentEvents.length > 50) recentEvents.pop()
}

function nvidiaChain(primary: string): string[] {
  const ranked = FALLBACK_RANK.primary_nvidia
    ? [FALLBACK_RANK.primary_nvidia, ...FALLBACK_RANK.nvidia_fallbacks]
    : []
  const out = [primary, ...ranked.filter((m) => m && m !== primary)]
  return [...new Set(out.filter(Boolean))] as string[]
}

function groqChain(): string[] {
  const models: string[] = []
  if (FALLBACK_RANK.groq_primary) models.push(FALLBACK_RANK.groq_primary)
  if (FALLBACK_RANK.groq_emergency) models.push(FALLBACK_RANK.groq_emergency)
  return models
}

export function classifyError(err: unknown): FallbackReason {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg === 'REQUEST_TIMEOUT' || /timeout|504/i.test(msg)) return 'timeout'
  if (/\b429\b|rate limit/i.test(msg)) return 'http_429'
  if (/\b503\b|\b502\b|\b500\b|\b5\d\d\b/i.test(msg)) return 'http_5xx'
  if (/401|403|invalid api key|auth/i.test(msg)) return 'auth'
  if (/404|model.*not/i.test(msg)) return 'model_unavailable'
  if (/empty response/i.test(msg)) return 'empty'
  if (/network|fetch|cors|econnreset|failed to fetch/i.test(msg)) return 'network'
  return 'network'
}

export function shouldFallback(reason: FallbackReason): boolean {
  return reason !== 'not_multimodal'
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted'))
  )
}

export type RoutedTarget = {
  provider: 'nvidia' | 'groq'
  model: string
  apiKey: string
}

export function buildFallbackPlan(
  settings: AppSettings,
  opts: { image: boolean; thinking: boolean },
): RoutedTarget[] {
  const plan: RoutedTarget[] = []
  const nvidiaKey = getProviderApiKey(settings, 'nvidia')
  const groqKey = getProviderApiKey(settings, 'groq')
  const requested = settings.provider

  if (requested === 'nvidia' && nvidiaKey) {
    const primary = String(settings.nvidiaModel || FALLBACK_RANK.primary_nvidia || '').trim()
    for (const model of nvidiaChain(primary)) {
      const caps = capabilitiesFor('nvidia', model)
      if (opts.image && !caps.multimodal) continue
      plan.push({ provider: 'nvidia', model, apiKey: nvidiaKey })
    }
  }

  if (groqKey && (requested === 'nvidia' || requested === 'groq')) {
    const groqPrimary =
      requested === 'groq'
        ? String(settings.groqModel || FALLBACK_RANK.groq_primary || '').trim()
        : FALLBACK_RANK.groq_primary || String(settings.groqModel || '').trim()
    const models = requested === 'groq' ? [groqPrimary, ...groqChain()] : groqChain()
    for (const model of [...new Set(models.filter(Boolean))]) {
      const caps = capabilitiesFor('groq', model)
      if (opts.image && !caps.multimodal) continue
      plan.push({ provider: 'groq', model, apiKey: groqKey })
    }
  }

  if (requested === 'groq' && nvidiaKey) {
    for (const model of nvidiaChain(FALLBACK_RANK.primary_nvidia)) {
      const caps = capabilitiesFor('nvidia', model)
      if (opts.image && !caps.multimodal) continue
      if (plan.some((t) => t.provider === 'nvidia' && t.model === model)) continue
      plan.push({ provider: 'nvidia', model, apiKey: nvidiaKey })
    }
  }

  const healthy = plan.filter((t) => canAttempt(circuitId(t.provider, t.model)))
  const nvidia = sortTargetsByHealth(healthy.filter((t) => t.provider === 'nvidia'))
  const groq = sortTargetsByHealth(healthy.filter((t) => t.provider === 'groq'))
  return requested === 'groq' ? [...groq, ...nvidia] : [...nvidia, ...groq]
}

export async function executeFallbackPlan<T>(opts: {
  settings: AppSettings
  image: boolean
  thinking: boolean
  requestId?: string
  onAttemptStart?: (index: number) => void
  run: (target: RoutedTarget) => Promise<T>
}): Promise<{ value: T; event: FallbackEvent }> {
  const requestId = opts.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const plan = buildFallbackPlan(opts.settings, { image: opts.image, thinking: opts.thinking })
  const hops: FallbackHop[] = []
  let retryCount = 0
  let lastReason: FallbackReason = 'model_unavailable'

  if (!plan.length) {
    throw new Error(formatCheckedModelsError([]))
  }

  for (let i = 0; i < plan.length; i++) {
    const target = plan[i]
    const id = circuitId(target.provider, target.model)
    if (!canAttempt(id)) {
      hops.push({ provider: target.provider, model: target.model, reason: 'circuit_open' })
      lastReason = 'circuit_open'
      continue
    }
    opts.onAttemptStart?.(i)
    const started = Date.now()
    const tryOnce = async () => opts.run(target)
    try {
      let value: T
      try {
        value = await tryOnce()
      } catch (first) {
        if (isAbortError(first)) throw first
        retryCount += 1
        value = await tryOnce()
      }
      const latencyMs = Date.now() - started
      recordSuccess(id)
      recordHealth(id, { ok: true, latencyMs })
      const event: FallbackEvent = {
        requestId,
        mode: opts.thinking ? 'thinking' : 'normal',
        requestedProvider: opts.settings.provider,
        requestedModel:
          opts.settings.provider === 'nvidia' ? opts.settings.nvidiaModel : opts.settings.groqModel,
        actualProvider: target.provider,
        actualModel: target.model,
        fallbackTriggered: hops.length > 0,
        fallbackReason: hops.length ? lastReason : 'success',
        retryCount,
        temperature: opts.thinking ? THINKING_TEMPERATURE : NORMAL_TEMPERATURE,
        reasoningEnabled: opts.thinking,
        hops: [...hops, { provider: target.provider, model: target.model, reason: 'success', latencyMs }],
        hasImage: opts.image,
      }
      pushEvent(event)
      return { value, event }
    } catch (err) {
      if (isAbortError(err)) throw err
      const reason = classifyError(err)
      lastReason = reason
      hops.push({ provider: target.provider, model: target.model, reason, latencyMs: Date.now() - started })
      recordHealth(id, { ok: false, latencyMs: Date.now() - started, reason })
      recordFailure(id)
      retryCount += 1
    }
  }

  const failed: FallbackEvent = {
    requestId,
    mode: opts.thinking ? 'thinking' : 'normal',
    requestedProvider: opts.settings.provider,
    requestedModel:
      opts.settings.provider === 'nvidia' ? opts.settings.nvidiaModel : opts.settings.groqModel,
    actualProvider: hops[hops.length - 1]?.provider || 'nvidia',
    actualModel: hops[hops.length - 1]?.model || '',
    fallbackTriggered: true,
    fallbackReason: lastReason,
    retryCount,
    temperature: opts.thinking ? THINKING_TEMPERATURE : NORMAL_TEMPERATURE,
    reasoningEnabled: opts.thinking,
    hops,
    hasImage: opts.image,
  }
  pushEvent(failed)
  throw new Error(formatCheckedModelsError(hops.map((h) => h.model)))
}

export { getCircuitState }
