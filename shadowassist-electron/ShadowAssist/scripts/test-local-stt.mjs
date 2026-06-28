/**
 * Smoke-test local STT under Electron's Node (no GUI window).
 * Usage: npm run test:local-stt
 */
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))
const cacheDir =
  process.argv[2] || path.join(process.env.APPDATA || '', 'VeilAssist-v2', 'transformers-cache')
const modelId = process.argv[3] || 'onnx-community/moonshine-base-ONNX'

const log = (msg) => {
  try {
    process.stdout.write(`${msg}\n`)
  } catch {
    /* EPIPE if stdout closed — ignore */
  }
}

;(async () => {
  const engineUrl = pathToFileURL(path.join(root, '..', 'lib', 'localStt', 'inferenceEngine.mjs')).href
  const eng = await import(engineUrl)
  eng.configureCacheDir(cacheDir)
  log(`[test:local-stt] loading ${modelId}`)
  await eng.ensureModel(modelId)
  log('[test:local-stt] OK')
})().catch((e) => {
  try {
    process.stderr.write(`[test:local-stt] FAIL ${e.message}\n`)
  } catch {
    /* ignore */
  }
  process.exitCode = 1
})
