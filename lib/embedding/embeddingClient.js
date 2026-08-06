// Copyright (c) 2026 VeilAssist. All rights reserved.
// Lazy worker client for local embeddings — async only, never blocks session stop/STT.

const path = require('path')
const { Worker } = require('worker_threads')
const { app } = require('electron')

const EMBED_TIMEOUT_MS = 25000
const PREPARE_TIMEOUT_MS = 120000

let worker = null
let prepared = false
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

function spawnWorker() {
  if (worker) return
  const workerPath = path.join(__dirname, 'embeddingWorker.mjs')
  worker = new Worker(workerPath, {
    type: 'module',
    workerData: { cacheDir: getCacheDir() },
  })

  worker.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return
    const jobId = msg.jobId
    if (msg.type === 'prepared') {
      prepared = true
      if (jobId != null) {
        const job = pendingJobs.get(jobId)
        if (job) {
          clearTimeout(job.timer)
          pendingJobs.delete(jobId)
          job.resolve(true)
        }
      }
      return
    }
    if (jobId == null) return
    const job = pendingJobs.get(jobId)
    if (!job) return
    clearTimeout(job.timer)
    pendingJobs.delete(jobId)
    if (msg.type === 'result') job.resolve(msg.embeddings)
    else if (msg.type === 'error') job.reject(new Error(msg.error || 'Embedding failed'))
  })

  worker.on('error', (err) => {
    console.warn('[embedding] worker error:', err?.message || err)
    rejectAllPending(err)
    try {
      worker?.terminate()
    } catch (_) {}
    worker = null
    prepared = false
    prepareInFlight = null
  })

  worker.on('exit', (code) => {
    if (code !== 0) console.warn('[embedding] worker exited', code)
    worker = null
    prepared = false
    prepareInFlight = null
  })
}

function postJob(type, payload, timeoutMs) {
  spawnWorker()
  const jobId = ++jobCounter
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingJobs.delete(jobId)
      reject(new Error('Embedding timeout'))
    }, timeoutMs)
    pendingJobs.set(jobId, { resolve, reject, timer })
    worker.postMessage({ type, jobId, ...payload })
  })
}

async function prepare() {
  if (prepared) return
  if (prepareInFlight) return prepareInFlight
  prepareInFlight = postJob('prepare', {}, PREPARE_TIMEOUT_MS)
    .then(() => {
      prepared = true
    })
    .catch((e) => {
      console.warn('[embedding] prepare failed:', e?.message || e)
      throw e
    })
    .finally(() => {
      prepareInFlight = null
    })
  return prepareInFlight
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedTexts(texts) {
  const list = (Array.isArray(texts) ? texts : []).map((t) => String(t || '').trim()).filter(Boolean)
  if (!list.length) return []
  await prepare()
  const embeddings = await postJob('embed', { texts: list }, EMBED_TIMEOUT_MS)
  return Array.isArray(embeddings) ? embeddings : []
}

/**
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  const [vec] = await embedTexts([text])
  return Array.isArray(vec) ? vec : []
}

function status() {
  return {
    prepared,
    workerRunning: !!worker,
    pendingJobs: pendingJobs.size,
  }
}

/** Terminate the worker and fail any in-flight jobs. Safe to call multiple times. */
function shutdown() {
  rejectAllPending(new Error('Embedding client shut down'))
  try {
    worker?.terminate()
  } catch (_) {}
  worker = null
  prepared = false
  prepareInFlight = null
}

module.exports = { prepare, embedTexts, embedText, status, shutdown }
