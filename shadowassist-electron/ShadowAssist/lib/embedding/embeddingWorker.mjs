// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 6 — local sentence embeddings (background worker, not on STT path).

import { parentPort, workerData } from 'worker_threads'
import { pipeline, env } from '@huggingface/transformers'

env.cacheDir = workerData?.cacheDir || undefined
env.allowLocalModels = true

/** @type {import('@huggingface/transformers').FeatureExtractionPipeline | null} */
let extractor = null
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

async function ensureExtractor() {
  if (extractor) return extractor
  extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' })
  return extractor
}

async function embedTexts(texts) {
  const pipe = await ensureExtractor()
  const out = []
  for (const text of texts) {
    const t = String(text || '').trim().slice(0, 4000)
    if (!t) {
      out.push([])
      continue
    }
    const result = await pipe(t, { pooling: 'mean', normalize: true })
    out.push(Array.from(result.data))
  }
  return out
}

parentPort.on('message', async (msg) => {
  if (!msg || typeof msg !== 'object') return
  const jobId = msg.jobId

  if (msg.type === 'prepare') {
    try {
      await ensureExtractor()
      parentPort.postMessage({ type: 'prepared', jobId, modelId: MODEL_ID })
    } catch (e) {
      parentPort.postMessage({ type: 'error', jobId, error: e?.message || String(e) })
    }
    return
  }

  if (msg.type === 'embed') {
    try {
      const texts = Array.isArray(msg.texts) ? msg.texts : [msg.text]
      const embeddings = await embedTexts(texts)
      parentPort.postMessage({ type: 'result', jobId, embeddings })
    } catch (e) {
      parentPort.postMessage({ type: 'error', jobId, error: e?.message || String(e) })
    }
  }
})
