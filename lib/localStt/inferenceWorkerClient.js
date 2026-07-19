// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively-style: ONNX in a worker thread — main process stays responsive for continuous PCM IPC.

const path = require('path')
const { Worker } = require('worker_threads')
const { app } = require('electron')

const TRANSCRIBE_TIMEOUT_MS = 45000
const PREPARE_TIMEOUT_MS = 120000

let worker = null
/** @type {Set<string>} */
const preparedModels = new Set()
/** @type {Promise<void> | null} */
let prepareInFlight = null
let jobCounter = 0
/** @type {Map<number, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>} */
const pendingJobs = new Map()

function getCacheDir() {
  try {
    return path.join(app.getPath('userData'), 'transformers-cache')
  } catch {
    return path.join(require('os').homedir(), '.cache', 'veilassist-transformers')
  }
}

function rejectAllPending(err) {
  for (const [, job] of pendingJobs.entries()) {
    clearTimeout(job.timer)
    job.reject(err)
  }
  pendingJobs.clear()
}

function resetWorkerState() {
  worker = null
  preparedModels.clear()
  prepareInFlight = null
}

function spawnWorker() {
  if (worker) return
  const workerPath = path.join(__dirname, 'inferenceWorker.mjs')
  worker = new Worker(workerPath, {
    type: 'module',
    workerData: { cacheDir: getCacheDir() },
  })

  worker.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return
    if (msg.type === 'prepared') {
      if (msg.modelId) preparedModels.add(String(msg.modelId))
      return
    }
    if (msg.type === 'status') return

    const jobId = msg.jobId
    if (jobId == null) return
    const job = pendingJobs.get(jobId)
    if (!job) return

    clearTimeout(job.timer)
    pendingJobs.delete(jobId)

    if (msg.type === 'result') {
      if (job.gate) {
        job.resolve({
          text: String(msg.text || ''),
          chunks: msg.chunks,
          language: msg.language,
        })
      } else {
        job.resolve(String(msg.text || ''))
      }
    } else if (msg.type === 'error') {
      job.reject(new Error(msg.error || 'Worker transcribe failed'))
    }
  })

  worker.on('error', (err) => {
    console.warn('[localStt:worker] error:', err?.message || err)
    rejectAllPending(err instanceof Error ? err : new Error(String(err)))
    resetWorkerState()
  })

  worker.on('exit', (code) => {
    if (code !== 0) console.warn('[localStt:worker] exited with code', code)
    rejectAllPending(new Error(`Worker exited (${code})`))
    resetWorkerState()
  })
}

async function prepare(modelId) {
  const id = String(modelId || '').trim()
  if (!id) throw new Error('No modelId')
  if (preparedModels.has(id)) return

  if (prepareInFlight) {
    await prepareInFlight
    if (preparedModels.has(id)) return
  }

  spawnWorker()

  prepareInFlight = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker?.off('message', onMessage)
      reject(new Error('Worker prepare timeout'))
    }, PREPARE_TIMEOUT_MS)

    const onMessage = (msg) => {
      if (msg?.type === 'prepared' && msg.modelId === id) {
        clearTimeout(timer)
        worker?.off('message', onMessage)
        preparedModels.add(id)
        resolve()
      } else if (msg?.type === 'error' && msg.jobId == null) {
        clearTimeout(timer)
        worker?.off('message', onMessage)
        reject(new Error(msg.error || 'Worker prepare failed'))
      }
    }

    worker.on('message', onMessage)
    worker.postMessage({ type: 'prepare', modelId: id })
  })

  try {
    await prepareInFlight
  } finally {
    prepareInFlight = null
  }
}

async function transcribePcm(modelId, pcmBuffer, { sampleRate = 16000, language, family, partial = false, gate = false } = {}) {
  const id = String(modelId || '').trim()
  if (!id) return gate ? null : ''
  await prepare(id)
  spawnWorker()

  const jobId = ++jobCounter
  const pcm = Buffer.isBuffer(pcmBuffer) ? pcmBuffer : Buffer.from(pcmBuffer)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingJobs.delete(jobId)
      reject(new Error('Worker transcribe timeout'))
    }, TRANSCRIBE_TIMEOUT_MS)

    pendingJobs.set(jobId, {
      resolve: (val) => resolve(val),
      reject,
      timer,
      gate: !!gate,
    })

    worker.postMessage({
      type: 'transcribe',
      jobId,
      modelId: id,
      pcm,
      sampleRate,
      language,
      family,
      partial,
      gate: !!gate,
    })
  })
}

function shutdown() {
  rejectAllPending(new Error('Worker shutdown'))
  if (worker) {
    try {
      worker.postMessage({ type: 'shutdown' })
    } catch (_) {}
    try {
      worker.terminate()
    } catch (_) {}
  }
  resetWorkerState()
}

module.exports = {
  prepare,
  transcribePcm,
  shutdown,
}
