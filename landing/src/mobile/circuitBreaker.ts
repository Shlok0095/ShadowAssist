export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export type CircuitConfig = {
  failureThreshold: number
  cooldownMs: number
  halfOpenMax: number
}

const DEFAULT_CIRCUIT: CircuitConfig = {
  failureThreshold: 3,
  cooldownMs: 30_000,
  halfOpenMax: 1,
}

type Breaker = {
  state: CircuitState
  failures: number
  openedAt: number
  halfOpenInFlight: number
}

const breakers = new Map<string, Breaker>()

function getBreaker(id: string): Breaker {
  let b = breakers.get(id)
  if (!b) {
    b = { state: 'CLOSED', failures: 0, openedAt: 0, halfOpenInFlight: 0 }
    breakers.set(id, b)
  }
  return b
}

export function circuitId(provider: string, model: string): string {
  return `${provider}::${model}`
}

export function resetCircuits(): void {
  breakers.clear()
}

export function getCircuitState(id: string, now = Date.now(), cfg = DEFAULT_CIRCUIT): CircuitState {
  const b = getBreaker(id)
  if (b.state === 'OPEN' && now - b.openedAt >= cfg.cooldownMs) {
    b.state = 'HALF_OPEN'
    b.halfOpenInFlight = 0
  }
  return b.state
}

export function canAttempt(id: string, now = Date.now(), cfg = DEFAULT_CIRCUIT): boolean {
  const state = getCircuitState(id, now, cfg)
  if (state === 'CLOSED') return true
  if (state === 'OPEN') return false
  const b = getBreaker(id)
  if (b.halfOpenInFlight >= cfg.halfOpenMax) return false
  b.halfOpenInFlight += 1
  return true
}

export function recordSuccess(id: string): void {
  const b = getBreaker(id)
  b.failures = 0
  b.halfOpenInFlight = 0
  b.state = 'CLOSED'
}

export function recordFailure(id: string, now = Date.now(), cfg = DEFAULT_CIRCUIT): CircuitState {
  const b = getBreaker(id)
  b.failures += 1
  b.halfOpenInFlight = 0
  if (b.state === 'HALF_OPEN' || b.failures >= cfg.failureThreshold) {
    b.state = 'OPEN'
    b.openedAt = now
  }
  return b.state
}

export function snapshotCircuits(): Record<string, CircuitState> {
  const out: Record<string, CircuitState> = {}
  for (const [id] of breakers) out[id] = getCircuitState(id)
  return out
}
