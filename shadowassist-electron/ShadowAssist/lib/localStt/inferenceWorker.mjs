/**
 * Local STT inference worker — CPU-only q8 ONNX via @huggingface/transformers.
 * All ops are serialized: parallel ONNX session opens cause Windows errno 13 (EACCES).
 */
import { parentPort, workerData } from 'worker_threads'
import path from 'path'
import os from 'os'
import { pipeline, env } from '@huggingface/transformers'
import { buildTranscribeOptions, isMoonshineModel, WHISPER_SAFE_DTYPE } from './inferenceConfig.mjs'

const cacheDir =
  workerData?.cacheDir ||
  path.join(os.homedir(), '.cache', 'veilassist-transformers')

env.cacheDir = cacheDir
env.backends.onnx.wasm.numThreads = Math.min(4, os.cpus()?.length || 2)
env.backends.onnx.gpu = false
env.allowRemoteModels = true
env.useBrowserCache = false
try {
  if (env.backends?.onnx) {
    env.backends.onnx.executionProviders = ['cpu']
  }
} catch {
  /* ignore */
}

/** @type {Map<string, import('@huggingface/transformers').AutomaticSpeechRecognitionPipeline>} */
const transcriberCache = new Map()
/** @type {Map<string, Promise<void>>} */
const modelLoadPromises = new Map()

/** @type {Promise<void>} */
let opQueue = Promise.resolve()

function enqueueOp(fn) {
  const task = opQueue.then(() => fn())
  opQueue = task.catch(() => {})
  return task
}

async function ensureModel(modelId) {
  const id = String(modelId || '').trim()
  if (!id) throw new Error('No modelId')
  if (transcriberCache.has(id)) return transcriberCache.get(id)

  const inFlight = modelLoadPromises.get(id)
  if (inFlight) {
    await inFlight
    return transcriberCache.get(id)
  }

  const loadPromise = (async () => {
    parentPort.postMessage({ type: 'status', status: 'loading', modelId: id })
    const pipe = await pipeline('automatic-speech-recognition', id, {
      dtype: WHISPER_SAFE_DTYPE,
      device: 'cpu',
    })
    transcriberCache.set(id, pipe)
    parentPort.postMessage({ type: 'status', status: 'ready', modelId: id })
  })()

  modelLoadPromises.set(id, loadPromise)
  try {
    await loadPromise
    return transcriberCache.get(id)
  } catch (err) {
    transcriberCache.delete(id)
    throw err
  } finally {
    modelLoadPromises.delete(id)
  }
}

function int16ToFloat32(buf) {
  const int16 = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 2))
  const out = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) out[i] = int16[i] / 32768
  return out
}

function whisperLanguageHint(language) {
  if (language === 'hi') return 'hi'
  if (language === 'en_hi_hinglish') return undefined
  if (language === 'en') return 'en'
  return undefined
}

function whisperChunksFromResult(result) {
  if (!result || typeof result !== 'object') return []
  const raw = result.chunks || result.segments || []
  if (!Array.isArray(raw)) return []
  return raw.map((c) => ({
    text: c?.text,
    avg_logprob: c?.avg_logprob ?? c?.score ?? c?.logprob,
    no_speech_prob: c?.no_speech_prob,
    compression_ratio: c?.compression_ratio,
  }))
}

async function handleMessage(msg) {
  if (msg.type === 'prepare') {
    try {
      await ensureModel(msg.modelId)
      parentPort.postMessage({ type: 'prepared', modelId: msg.modelId })
    } catch (err) {
      parentPort.postMessage({
        type: 'error',
        error: err?.message || String(err),
      })
    }
    return
  }

  if (msg.type === 'transcribe') {
    const { jobId, modelId, pcm, sampleRate, language, family, partial = false, gate = false } = msg
    try {
      const pipe = await ensureModel(modelId)
      const audio = int16ToFloat32(Buffer.from(pcm))
      if (audio.length < 1600) {
        parentPort.postMessage({ type: 'result', jobId, text: '' })
        return
      }

      const moonshine = family === 'moonshine' || isMoonshineModel(modelId)
      /** @type {Record<string, unknown>} */
      let opts = buildTranscribeOptions({
        modelId,
        family: moonshine ? 'moonshine' : family,
        partial: !!partial,
        gate: !!gate && !moonshine,
      })
      if (!moonshine) {
        const lang = whisperLanguageHint(language)
        if (lang) opts.language = lang === 'en' ? 'english' : lang
      }

      const result = await pipe(audio, opts)
      const text =
        typeof result === 'string'
          ? result
          : result?.text != null
            ? String(result.text)
            : Array.isArray(result?.chunks)
              ? result.chunks.map((c) => c.text).join(' ')
              : ''

      if (gate && !moonshine) {
        parentPort.postMessage({
          type: 'result',
          jobId,
          gate: true,
          text: String(text || '').trim(),
          chunks: whisperChunksFromResult(result),
          language: result?.language,
        })
        return
      }

      parentPort.postMessage({ type: 'result', jobId, text: String(text || '').trim() })
    } catch (err) {
      parentPort.postMessage({
        type: 'error',
        jobId,
        error: err?.message || String(err),
      })
    }
    return
  }

  if (msg.type === 'shutdown') {
    process.exit(0)
  }
}

parentPort.on('message', (msg) => {
  enqueueOp(() => handleMessage(msg))
})
