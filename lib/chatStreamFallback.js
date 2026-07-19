// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Pre-first-token fallback: one provider commits visible output, never both.

const PROVIDER_FAILURE_COOLDOWN_MS = 30_000
const providerCircuitOpenUntil = new Map()

function createAbortError(message = 'Request aborted') {
  const error = new Error(message)
  error.name = 'AbortError'
  error.code = 'ABORT_ERR'
  return error
}

function createStreamError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function isAbortError(error, signal) {
  return !!signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
}

function numericStatus(error) {
  const raw = error?.status ?? error?.statusCode ?? error?.response?.status
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function isEligibleFallbackError(error) {
  if (!error || isAbortError(error)) return false
  if (error.code === 'EMPTY_STREAM' || error.code === 'FIRST_TOKEN_TIMEOUT') return true
  const status = numericStatus(error)
  if (status === 408 || status === 429 || (status != null && status >= 500 && status <= 599)) return true
  if (status != null) return false
  const code = String(error.code || '').toUpperCase()
  if ([
    'ECONNRESET',
    'ECONNREFUSED',
    'ECONNABORTED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
  ].includes(code)) return true
  return /^(APIConnectionError|APIConnectionTimeoutError|TimeoutError)$/.test(String(error.name || ''))
}

function sanitizedFailure(error) {
  return {
    status: numericStatus(error),
    code: String(error?.code || error?.name || 'STREAM_ERROR').slice(0, 80),
  }
}

function attemptKey(attempt) {
  return `${attempt?.provider || 'unknown'}:${attempt?.model || 'unknown'}`
}

function isAttemptCircuitOpen(attempt, now = Date.now()) {
  const key = attemptKey(attempt)
  const until = providerCircuitOpenUntil.get(key) || 0
  if (until <= now) {
    providerCircuitOpenUntil.delete(key)
    return false
  }
  return true
}

function openAttemptCircuit(attempt, now = Date.now()) {
  providerCircuitOpenUntil.set(attemptKey(attempt), now + PROVIDER_FAILURE_COOLDOWN_MS)
}

function resetFallbackHealth() {
  providerCircuitOpenUntil.clear()
}

function linkAbortSignal(parentSignal, controller) {
  if (!parentSignal) return () => {}
  const abort = () => controller.abort(parentSignal.reason)
  if (parentSignal.aborted) abort()
  else parentSignal.addEventListener('abort', abort, { once: true })
  return () => parentSignal.removeEventListener('abort', abort)
}

async function firstIteratorResult(iterator, timeoutMs, controller) {
  const pending = Promise.resolve()
    .then(() => iterator.next())
    .then(
      (result) => ({ kind: 'result', result }),
      (error) => ({ kind: 'error', error }),
    )
  if (!(timeoutMs > 0)) return pending
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)
  })
  const outcome = await Promise.race([pending, timeout])
  clearTimeout(timer)
  if (outcome.kind === 'timeout') {
    controller.abort(createStreamError('FIRST_TOKEN_TIMEOUT', 'Provider first-token timeout'))
    void iterator.return?.().catch?.(() => {})
  }
  return outcome
}

async function* consumeAttempt(attempt, parentSignal, firstTokenTimeoutMs) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const unlink = linkAbortSignal(parentSignal, controller)
  let iterator
  let committed = false
  try {
    if (parentSignal?.aborted) throw createAbortError()
    iterator = attempt.open(controller.signal)[Symbol.asyncIterator]()
    const first = await firstIteratorResult(iterator, firstTokenTimeoutMs, controller)
    if (parentSignal?.aborted) throw createAbortError()
    if (first.kind === 'timeout') {
      throw createStreamError('FIRST_TOKEN_TIMEOUT', `${attempt.provider} did not produce a token in time`)
    }
    if (first.kind === 'error') throw first.error
    if (first.result.done) throw createStreamError('EMPTY_STREAM', `${attempt.provider} returned no content`)

    committed = true
    yield first.result.value
    while (true) {
      if (parentSignal?.aborted) throw createAbortError()
      const next = await iterator.next()
      if (next.done) {
        return {
          finishReason: next.value?.finishReason || 'stop',
          elapsedMs: Date.now() - startedAt,
          committed,
        }
      }
      yield next.value
    }
  } catch (error) {
    error.streamAttempt = {
      provider: attempt.provider,
      model: attempt.model,
      elapsedMs: Date.now() - startedAt,
      committed,
      ...sanitizedFailure(error),
    }
    throw error
  } finally {
    unlink()
    if (parentSignal?.aborted && iterator) void iterator.return?.().catch?.(() => {})
  }
}

async function* runStreamingFallback({
  primary,
  fallback = null,
  signal,
  firstTokenTimeoutMs = 5000,
  onAttempt,
  onFinish,
}) {
  const attempts = []
  const run = async function* (attempt, timeoutMs, fallbackUsed) {
    onAttempt?.({ provider: attempt.provider, model: attempt.model, fallbackUsed })
    const generator = consumeAttempt(attempt, signal, timeoutMs)
    let result
    while (true) {
      const next = await generator.next()
      if (next.done) {
        result = next.value || {}
        break
      }
      yield next.value
    }
    attempts.push({
      provider: attempt.provider,
      model: attempt.model,
      outcome: result.finishReason === 'length' ? 'truncated' : 'success',
      elapsedMs: result.elapsedMs,
    })
    providerCircuitOpenUntil.delete(attemptKey(attempt))
    const metadata = {
      outcome: result.finishReason === 'length' ? 'truncated' : 'complete',
      provider: attempt.provider,
      model: attempt.model,
      fallbackUsed,
      finishReason: result.finishReason || 'stop',
      attempts: [...attempts],
    }
    onFinish?.(metadata)
    return metadata
  }

  if (fallback && isAttemptCircuitOpen(primary)) {
    attempts.push({
      provider: primary.provider,
      model: primary.model,
      outcome: 'skipped_circuit_open',
      elapsedMs: 0,
    })
    return yield* run(fallback, 0, true)
  }

  try {
    return yield* run(primary, fallback ? firstTokenTimeoutMs : 0, false)
  } catch (primaryError) {
    if (isAbortError(primaryError, signal)) throw createAbortError()
    attempts.push({
      provider: primary.provider,
      model: primary.model,
      outcome: primaryError.code === 'EMPTY_STREAM' ? 'empty' : 'failed',
      elapsedMs: primaryError.streamAttempt?.elapsedMs,
      ...sanitizedFailure(primaryError),
    })
    if (primaryError.streamAttempt?.committed || !fallback || !isEligibleFallbackError(primaryError)) {
      primaryError.streamMetadata = {
        outcome: primaryError.streamAttempt?.committed ? 'partial-failed' : 'failed',
        provider: primary.provider,
        model: primary.model,
        fallbackUsed: false,
        attempts: [...attempts],
      }
      throw primaryError
    }
    openAttemptCircuit(primary)
  }

  if (signal?.aborted) throw createAbortError()
  try {
    return yield* run(fallback, 0, true)
  } catch (fallbackError) {
    if (isAbortError(fallbackError, signal)) throw createAbortError()
    attempts.push({
      provider: fallback.provider,
      model: fallback.model,
      outcome: fallbackError.code === 'EMPTY_STREAM' ? 'empty' : 'failed',
      elapsedMs: fallbackError.streamAttempt?.elapsedMs,
      ...sanitizedFailure(fallbackError),
    })
    fallbackError.streamMetadata = {
      outcome: fallbackError.streamAttempt?.committed ? 'partial-failed' : 'failed',
      provider: fallback.provider,
      model: fallback.model,
      fallbackUsed: true,
      attempts: [...attempts],
    }
    throw fallbackError
  }
}

module.exports = {
  isEligibleFallbackError,
  isAttemptCircuitOpen,
  resetFallbackHealth,
  runStreamingFallback,
}
