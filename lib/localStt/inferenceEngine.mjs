/**
 * Main-process local STT engine — Natively LocalWhisperSTT inference profile.
 */
import path from 'path'
import os from 'os'
import { pipeline, env } from '@huggingface/transformers'
import { resolveInferenceConfig, buildTranscribeOptions, isMoonshineModel } from './inferenceConfig.mjs'

let cacheDirConfigured = null
let inferenceConfig = null
/** @type {import('@huggingface/transformers').AutomaticSpeechRecognitionPipeline | null} */
let transcriber = null
let loadedModelId = null
/** @type {Promise<void> | null} */
let modelLoadPromise = null

export function configureCacheDir(cacheDir) {
  if (cacheDirConfigured === cacheDir) return
  cacheDirConfigured = cacheDir
  inferenceConfig = resolveInferenceConfig()
  env.cacheDir = cacheDir
  env.backends.onnx.wasm.numThreads = Math.min(4, os.cpus()?.length || 2)
  env.allowRemoteModels = true
  env.useBrowserCache = false
  try {
    if (env.backends?.onnx) {
      env.backends.onnx.executionProviders = inferenceConfig.executionProviders
      // Prefer native ORT when available (DirectML / CoreML EPs).
      env.backends.onnx.gpu = inferenceConfig.executionProviders.some(
        (p) => p === 'dml' || p === 'coreml' || p === 'cuda',
      )
    }
  } catch {
    /* wasm-only fallback */
  }
}

async function loadPipeline(modelId) {
  const cfg = inferenceConfig || resolveInferenceConfig()
  return pipeline('automatic-speech-recognition', modelId, {
    dtype: cfg.dtype,
    device: cfg.device,
  })
}

export async function ensureModel(modelId) {
  if (transcriber && loadedModelId === modelId) return transcriber
  if (modelLoadPromise && loadedModelId === modelId) {
    await modelLoadPromise
    return transcriber
  }

  loadedModelId = modelId
  transcriber = null

  modelLoadPromise = (async () => {
    transcriber = await loadPipeline(modelId)
  })()

  try {
    await modelLoadPromise
    return transcriber
  } catch (err) {
    transcriber = null
    loadedModelId = null
    throw err
  } finally {
    modelLoadPromise = null
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

export async function transcribePcm(
  modelId,
  pcmBuffer,
  { sampleRate = 16000, language, family, partial = false } = {},
) {
  const pipe = await ensureModel(modelId)
  const audio = int16ToFloat32(Buffer.from(pcmBuffer))
  if (audio.length < 1600) return ''

  const moonshine = family === 'moonshine' || isMoonshineModel(modelId)
  /** @type {Record<string, unknown>} */
  let opts
  if (moonshine) {
    opts = buildTranscribeOptions({ modelId, family: 'moonshine', partial })
  } else {
    opts = buildTranscribeOptions({ modelId, family, partial })
    const lang = whisperLanguageHint(language)
    if (lang) opts.language = lang
  }

  const result = await pipe(audio, opts)
  if (typeof result === 'string') return result.trim()
  if (result?.text != null) return String(result.text).trim()
  if (Array.isArray(result?.chunks)) {
    return result.chunks.map((c) => c.text).join(' ').trim()
  }
  return ''
}

export function resetEngine() {
  transcriber = null
  loadedModelId = null
  modelLoadPromise = null
}
