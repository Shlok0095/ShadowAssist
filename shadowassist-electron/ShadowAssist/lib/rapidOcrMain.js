// Copyright (c) 2026 ShadowAssist. All rights reserved.
// PP-OCRv4 (RapidOCR/Paddle ONNX) in the Electron main process.

const path = require('path')
const fs = require('fs')

let sharp = null
function getSharp() {
  if (!sharp) {
    sharp = require('sharp')
  }
  return sharp
}

let ocrInstance = null
let initPromise = null
let lastInitError = ''

/** Native onnxruntime cannot read inside app.asar — models live in app.asar.unpacked. */
function toAsarUnpacked(fsPath) {
  if (typeof fsPath !== 'string') return fsPath
  const asarSeg = `${path.sep}app.asar${path.sep}`
  if (!fsPath.includes(asarSeg)) return fsPath
  return fsPath.split(asarSeg).join(`${path.sep}app.asar.unpacked${path.sep}`)
}

function isPackagedApp() {
  try {
    return require('electron').app?.isPackaged === true
  } catch (_) {
    return false
  }
}

function getRepeatoOcrRoot() {
  if (isPackagedApp() && process.resourcesPath) {
    const unpackedRoot = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      '@repeato',
      'ocr',
    )
    if (fs.existsSync(path.join(unpackedRoot, 'build', 'node', 'index.cjs'))) {
      return unpackedRoot
    }
  }
  const pkgJson = toAsarUnpacked(require.resolve('@repeato/ocr/package.json'))
  return path.dirname(pkgJson)
}

function getRepeatoOcrModelPaths() {
  const assetsDir = path.join(getRepeatoOcrRoot(), 'build', 'node', 'assets')
  const models = {
    detectionPath: path.join(assetsDir, 'ch_PP-OCRv4_det_infer.onnx'),
    recognitionPath: path.join(assetsDir, 'ch_PP-OCRv4_rec_infer.onnx'),
    dictionaryPath: path.join(assetsDir, 'ppocr_keys_v1.txt'),
  }
  const missing = Object.entries(models)
    .filter(([, p]) => !fs.existsSync(p))
    .map(([k, p]) => `${k}=${p}`)
  if (missing.length) {
    throw new Error(`OCR model assets missing: ${missing.join('; ')}`)
  }
  return models
}

function getOcrModule() {
  if (isPackagedApp() && process.resourcesPath) {
    const cjs = path.join(getRepeatoOcrRoot(), 'build', 'node', 'index.cjs')
    if (fs.existsSync(cjs)) return require(cjs)
  }
  return require('@repeato/ocr')
}

async function getOcr() {
  if (ocrInstance) return ocrInstance
  if (initPromise) return initPromise
  initPromise = (async () => {
    lastInitError = ''
    const Ocr = getOcrModule()
    ocrInstance = await Ocr.create({ models: getRepeatoOcrModelPaths() })
    return ocrInstance
  })()
  try {
    return await initPromise
  } catch (e) {
    lastInitError = e?.message || String(e)
    console.error('[rapidOcr] init failed:', lastInitError)
    throw e
  } finally {
    initPromise = null
  }
}

function pngBufferFromDataUrl(dataUrl) {
  const s = String(dataUrl || '')
  const i = s.indexOf(',')
  const b64 = i >= 0 ? s.slice(i + 1) : s
  if (!b64) return null
  const buf = Buffer.from(b64, 'base64')
  return buf.length ? buf : null
}

async function recognizePngBuffer(pngBuffer) {
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : null
  if (!buf || buf.length < 40) return ''
  const ocr = await getOcr()
  const { data, info } = await getSharp()(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const result = await ocr.detect({
    data,
    width: info.width,
    height: info.height,
  })
  const lines = (result?.texts || []).map((t) => String(t?.text || '').trim()).filter(Boolean)
  return lines.join('\n').trim()
}

async function recognizePngDataUrl(dataUrl) {
  const buf = pngBufferFromDataUrl(dataUrl)
  if (!buf) return ''
  return recognizePngBuffer(buf)
}

async function warmup() {
  await getOcr()
}

async function terminate() {
  try {
    if (ocrInstance) {
      await ocrInstance.release()
      ocrInstance = null
    }
    const Ocr = getOcrModule()
    if (typeof Ocr.releaseAll === 'function') await Ocr.releaseAll()
  } catch (e) {
    console.warn('[rapidOcr] terminate:', e?.message || e)
    ocrInstance = null
  }
}

function getDiagnostics() {
  const root = getRepeatoOcrRoot()
  const assetsDir = path.join(root, 'build', 'node', 'assets')
  let models = null
  try {
    models = getRepeatoOcrModelPaths()
  } catch (e) {
    models = { error: e?.message || String(e) }
  }
  return {
    packaged: isPackagedApp(),
    repeatoRoot: root,
    assetsDir,
    modelsOk: models && !models.error,
    modelsError: models?.error || lastInitError || '',
    ocrReady: !!ocrInstance,
  }
}

module.exports = {
  recognizePngBuffer,
  recognizePngDataUrl,
  warmup,
  terminate,
  getDiagnostics,
}
