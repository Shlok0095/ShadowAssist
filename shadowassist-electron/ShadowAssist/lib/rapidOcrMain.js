// Copyright (c) 2026 ShadowAssist. All rights reserved.
// PP-OCRv4 (RapidOCR/Paddle ONNX) in the Electron main process.

const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

let ocrInstance = null
let initPromise = null

/** Native onnxruntime cannot read inside app.asar — models live in app.asar.unpacked. */
function toAsarUnpacked(fsPath) {
  if (typeof fsPath !== 'string') return fsPath
  const asarSeg = `${path.sep}app.asar${path.sep}`
  if (!fsPath.includes(asarSeg)) return fsPath
  return fsPath.split(asarSeg).join(`${path.sep}app.asar.unpacked${path.sep}`)
}

function getRepeatoOcrModelPaths() {
  const pkgJson = toAsarUnpacked(require.resolve('@repeato/ocr/package.json'))
  const assetsDir = path.join(path.dirname(pkgJson), 'build', 'node', 'assets')
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
  return require('@repeato/ocr')
}

async function getOcr() {
  if (ocrInstance) return ocrInstance
  if (initPromise) return initPromise
  initPromise = (async () => {
    const Ocr = getOcrModule()
    ocrInstance = await Ocr.create({ models: getRepeatoOcrModelPaths() })
    return ocrInstance
  })()
  try {
    return await initPromise
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
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
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

module.exports = {
  recognizePngBuffer,
  recognizePngDataUrl,
  warmup,
  terminate,
}
