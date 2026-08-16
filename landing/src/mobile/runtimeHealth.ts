import { FALLBACK_RANK } from './generated/fallbackRank.generated'
import { getCircuitState, type CircuitState } from './circuitBreaker'

export type HealthSample = {
  ok: boolean
  latencyMs: number
  reason?: string
  at: number
}

const WINDOW = 20
const samples = new Map<string, HealthSample[]>()

export function recordHealth(id: string, sample: Omit<HealthSample, 'at'>): void {
  const list = samples.get(id) || []
  list.unshift({ ...sample, at: Date.now() })
  samples.set(id, list.slice(0, WINDOW))
}

export function resetHealth(): void {
  samples.clear()
}

function percentile(xs: number[], p: number): number {
  if (!xs.length) return Number.NaN
  const ys = [...xs].sort((a, b) => a - b)
  const k = (ys.length - 1) * (p / 100)
  const f = Math.floor(k)
  const c = Math.ceil(k)
  if (f === c) return ys[f]
  return ys[f] * (c - k) + ys[c] * (k - f)
}

export function liveHealth(id: string): {
  recent_success_rate: number
  recent_error_rate: number
  recent_timeout_rate: number
  recent_latency: number
  p95_latency: number
  availability: number
  n: number
} {
  const list = samples.get(id) || []
  const n = list.length
  if (!n) {
    return {
      recent_success_rate: 1,
      recent_error_rate: 0,
      recent_timeout_rate: 0,
      recent_latency: 0,
      p95_latency: 0,
      availability: 1,
      n: 0,
    }
  }
  const ok = list.filter((s) => s.ok).length
  const timeouts = list.filter((s) => s.reason === 'timeout').length
  const lats = list.filter((s) => s.ok).map((s) => s.latencyMs)
  return {
    recent_success_rate: ok / n,
    recent_error_rate: 1 - ok / n,
    recent_timeout_rate: timeouts / n,
    recent_latency: lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0,
    p95_latency: lats.length ? percentile(lats, 95) : 0,
    availability: ok / n,
    n,
  }
}

function benchmarkScore(provider: string, model: string): number {
  const ranked = (FALLBACK_RANK as unknown as { ranked?: Array<{ provider: string; model: string; overall: number }> }).ranked
  const hit = ranked?.find((r) => r.provider === provider && r.model === model)
  return typeof hit?.overall === 'number' ? hit.overall : 0.5
}

export function combinedHealthScore(provider: string, model: string, circuit: CircuitState): number {
  const id = `${provider}::${model}`
  const live = liveHealth(id)
  const bench = benchmarkScore(provider, model)
  const liveScore =
    live.n === 0
      ? 0.7
      : live.recent_success_rate * 0.7 + Math.max(0, 1 - live.p95_latency / 12000) * 0.3
  let score = bench * 0.55 + liveScore * 0.45
  if (circuit === 'OPEN') score = 0
  if (circuit === 'HALF_OPEN') score *= 0.5
  return score
}

export function sortTargetsByHealth<T extends { provider: string; model: string }>(targets: T[]): T[] {
  return [...targets].sort((a, b) => {
    const sa = combinedHealthScore(a.provider, a.model, getCircuitState(`${a.provider}::${a.model}`))
    const sb = combinedHealthScore(b.provider, b.model, getCircuitState(`${b.provider}::${b.model}`))
    if (a.provider !== b.provider) {
      if (a.provider === 'nvidia' && sa > 0) return -1
      if (b.provider === 'nvidia' && sb > 0) return 1
    }
    return sb - sa
  })
}
