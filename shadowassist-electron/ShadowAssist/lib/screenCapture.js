// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { desktopCapturer, nativeImage, screen } = require('electron')
const path = require('path')
const { Worker } = require('worker_threads')

let tesseractWorker = null
let ocrNodeWorker = null
let ocrReqId = 0
/** @type {Map<number, { resolve: (v: string) => void, reject: (e: Error) => void }>} */
const ocrPending = new Map()

/**
 * Full-frame capture: target thumbnail size for desktopCapturer (capped to physical display size below).
 * Downstream OCR still resizes via OCR_MAX_W.
 */
const CAPTURE_THUMB_W = 1920
const CAPTURE_THUMB_H = 1080
const OCR_MAX_W = 1280

const CAPTURE_COOLDOWN_MS = 1200
const OCR_LOCK_MS = 1500

/** Minimum score for the full-frame OCR result to be used. */
const MIN_FRAME_SCORE = 3

let cachedScreenSourceId = null

let lastCaptureTime = 0
let captureFailCooldownUntil = 0
let ocrRunningUntil = 0
let lastCompositeScreenHash = ''
/** Fingerprint of last raw thumbnail data URL — skip decode + OCR if frame unchanged (see captureScreenText). */
let lastRawFrameFingerprint = ''
let lastOcrForSamePng = ''
let captureFailCount = 0

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Never request a thumbnail larger than the primary display in physical pixels. */
function getOcrThumbnailSize() {
  const d = screen.getPrimaryDisplay()
  const sw = Math.max(1, Math.round(d.size.width * d.scaleFactor))
  const sh = Math.max(1, Math.round(d.size.height * d.scaleFactor))
  return {
    width: Math.min(CAPTURE_THUMB_W, sw),
    height: Math.min(CAPTURE_THUMB_H, sh),
  }
}

function getFastHash(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return ''
  return buffer.slice(0, Math.min(400, buffer.length)).toString('base64')
}

/** Cheap stable-ish fingerprint of desktop thumbnail PNG (no full decode). Same frame → skip OCR work. */
function fingerprintDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return ''
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  if (b64.length < 80) return ''
  const head = b64.slice(0, 240)
  const tail = b64.slice(-240)
  const mid = b64.slice(Math.floor(b64.length / 2), Math.floor(b64.length / 2) + 120)
  return `${b64.length}|${head}|${mid}|${tail}`
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSemanticallySame(a, b) {
  if (!a || !b) return false
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (na === nb) return true
  const wa = new Set(na.split(/\s+/).filter(Boolean))
  const wb = new Set(nb.split(/\s+/).filter(Boolean))
  if (wa.size === 0 || wb.size === 0) return false
  let overlap = 0
  wa.forEach((w) => {
    if (wb.has(w)) overlap++
  })
  return overlap / Math.max(wa.size, 1) > 0.85
}

function scoreText(text) {
  if (!text) return 0
  const words = text.split(/\s+/).filter((w) => w.length > 2)
  const alpha = (text.match(/[a-zA-Z]/g) || []).length

  let score = 0
  if (words.length > 5) score += 2
  if (alpha > 20) score += 2
  if (text.includes('?')) score += 3
  if (/function|class|api|error|data|model|algorithm/i.test(text)) score += 3
  if (text.length > 80) score += 2

  return score
}

/**
 * Prepare the full frame for OCR.
 * Returns the image resized to OCR_MAX_W if needed — NO region splitting.
 * Region splitting was causing missed content when text spanned zone boundaries.
 */
function prepareFullFrame(img) {
  if (img.isEmpty()) return null
  const { width } = img.getSize()
  if (width > OCR_MAX_W) {
    return img.resize({ width: OCR_MAX_W })
  }
  return img
}

/** Grayscale + contrast stretch + ~1.5× scale before Tesseract (no new deps). */
function preprocessImageForOcr(img) {
  if (img.isEmpty()) return img
  try {
    const { width, height } = img.getSize()
    if (width < 2 || height < 2) return img
    const bmp = img.toBitmap()
    const stride = width * 4
    if (bmp.length < stride * height) return img
    const out = Buffer.alloc(bmp.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * stride + x * 4
        const b = bmp[i]
        const g = bmp[i + 1]
        const r = bmp[i + 2]
        const a = bmp[i + 3]
        let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        gray = Math.min(255, Math.max(0, Math.round((gray - 128) * 1.35 + 128)))
        out[i] = gray
        out[i + 1] = gray
        out[i + 2] = gray
        out[i + 3] = a
      }
    }
    const grayImg = nativeImage.createFromBitmap(out, { width, height })
    const nw = Math.min(1600, Math.round(width * 1.5))
    const nh = Math.max(1, Math.round(height * (nw / width)))
    return grayImg.resize({ width: nw, height: nh })
  } catch (_) {
    return img
  }
}

function fullFrameFromDataUrl(imageDataUrl) {
  let img = nativeImage.createFromDataURL(imageDataUrl)
  if (img.isEmpty()) return null
  const { width } = img.getSize()
  if (width > OCR_MAX_W) {
    img = img.resize({ width: OCR_MAX_W })
  }
  const png = img.toPNG()
  if (!png || png.length < 80) return null
  return { png, imageForTesseract: png }
}

async function initTesseract() {
  if (tesseractWorker) return tesseractWorker
  try {
    const Tesseract = require('tesseract.js')
    tesseractWorker = await Tesseract.createWorker('eng', 1, {
      logger: () => {},
      errorHandler: (m) => console.warn('[Tesseract]', m),
    })
    await tesseractWorker.setParameters({
      tessedit_pageseg_mode: String(Tesseract.PSM.AUTO),
      preserve_interword_spaces: '1',
    })
    return tesseractWorker
  } catch (e) {
    console.error('Tesseract init failed:', e)
    return null
  }
}

function getOcrNodeWorker() {
  if (ocrNodeWorker) return ocrNodeWorker
  try {
    const w = new Worker(path.join(__dirname, 'ocrWorkerThread.js'))
    w.on('message', (msg) => {
      if (!msg || msg.type !== 'result') return
      const p = ocrPending.get(msg.id)
      if (!p) return
      ocrPending.delete(msg.id)
      if (msg.ok) p.resolve(msg.text || '')
      else p.reject(new Error(msg.error || 'OCR worker failed'))
    })
    w.on('error', (err) => {
      for (const [, pending] of ocrPending) pending.reject(err)
      ocrPending.clear()
      try {
        w.terminate()
      } catch (_) {}
      ocrNodeWorker = null
    })
    ocrNodeWorker = w
    return w
  } catch (e) {
    console.warn('OCR worker thread unavailable:', e?.message || e)
    return null
  }
}

function recognizePngInWorker(pngBuffer) {
  const w = getOcrNodeWorker()
  if (!w) return Promise.reject(new Error('no OCR worker'))
  const id = ++ocrReqId
  return new Promise((resolve, reject) => {
    ocrPending.set(id, { resolve, reject })
    try {
      w.postMessage({ type: 'recognize', id, buffer: pngBuffer })
    } catch (e) {
      ocrPending.delete(id)
      reject(e)
    }
  })
}

async function ocrPngBuffer(buf, imageForTesseract) {
  try {
    return await recognizePngInWorker(buf)
  } catch (e) {
    console.warn('Worker OCR fallback (main thread):', e?.message || e)
    const worker = await initTesseract()
    if (!worker) return ''
    try {
      const { data } = await worker.recognize(imageForTesseract)
      return (data?.text || '').trim()
    } catch (err) {
      console.warn('OCR recognize:', err?.message || err)
      return ''
    }
  }
}

async function safeCaptureDataUrl() {
  for (let i = 0; i < 3; i++) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: getOcrThumbnailSize(),
      })
      if (!sources?.length) {
        cachedScreenSourceId = null
        throw new Error('no screen sources')
      }
      let pick = sources[0]
      if (cachedScreenSourceId) {
        const m = sources.find((s) => s.id === cachedScreenSourceId)
        if (m) pick = m
      }
      cachedScreenSourceId = pick.id
      const dataUrl = pick.thumbnail?.toDataURL('image/png')
      if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 80) throw new Error('invalid thumbnail')
      captureFailCount = 0
      return dataUrl
    } catch (_) {
      if (i < 2) await sleep(150)
    }
  }
  captureFailCount++
  const delay = Math.min(1000 * 2 ** captureFailCount, 8000)
  captureFailCooldownUntil = Date.now() + delay
  return null
}

/**
 * Screen pipeline (aligned with “capture often, OCR when needed”):
 * 1. Thumbnail grab (Electron desktopCapturer) — gated by cooldown unless bypass.
 * 2. Raw frame fingerprint — if unchanged vs last run, return cached OCR (no decode / no Tesseract).
 * 3. Region crop (top / center / bottom) + composite hash — if regions unchanged, return cache (no OCR).
 * 4. OCR per region (worker) → score → keep top regions → semantic dedupe vs previous text.
 *
 * @param {{ bypassCaptureCooldown?: boolean }} [opts]
 */
async function captureScreenText(opts = {}) {
  const bypassCd = opts.bypassCaptureCooldown === true

  if (Date.now() < captureFailCooldownUntil) {
    return lastOcrForSamePng
  }
  if (Date.now() < ocrRunningUntil) {
    return lastOcrForSamePng
  }
  if (!bypassCd && Date.now() - lastCaptureTime < CAPTURE_COOLDOWN_MS) {
    return lastOcrForSamePng
  }

  const lockToken = Date.now() + OCR_LOCK_MS
  ocrRunningUntil = lockToken

  try {
    const imageDataUrl = await safeCaptureDataUrl()
    if (!imageDataUrl) {
      return lastOcrForSamePng
    }

    lastCaptureTime = Date.now()

    const rawFp = fingerprintDataUrl(imageDataUrl)
    if (rawFp && rawFp === lastRawFrameFingerprint && !bypassCd) {
      return lastOcrForSamePng
    }
    lastRawFrameFingerprint = rawFp

    let img = nativeImage.createFromDataURL(imageDataUrl)
    if (img.isEmpty()) {
      return lastOcrForSamePng
    }

    // Full-frame: no region splitting — read the whole screen in one OCR pass.
    const frameImg = prepareFullFrame(img)
    if (!frameImg) return lastOcrForSamePng

    const framePng = frameImg.toPNG()
    if (!framePng || framePng.length < 80) return lastOcrForSamePng

    const frameHash = getFastHash(Buffer.isBuffer(framePng) ? framePng : Buffer.from(framePng))
    if (frameHash && frameHash === lastCompositeScreenHash && !bypassCd) {
      return lastOcrForSamePng
    }
    lastCompositeScreenHash = frameHash

    const processed = preprocessImageForOcr(frameImg)
    const processedPng = processed.toPNG()
    if (!processedPng || processedPng.length < 40) return lastOcrForSamePng

    const buf = Buffer.isBuffer(processedPng) ? processedPng : Buffer.from(processedPng)
    const rawText = (await ocrPngBuffer(buf, processedPng)).trim()

    if (!rawText || scoreText(rawText) < MIN_FRAME_SCORE) {
      lastOcrForSamePng = ''
      return ''
    }

    if (lastOcrForSamePng && isSemanticallySame(rawText, lastOcrForSamePng)) {
      return lastOcrForSamePng
    }
    lastOcrForSamePng = rawText
    return rawText
  } finally {
    if (ocrRunningUntil === lockToken) ocrRunningUntil = 0
  }
}

/**
 * @param {{ bypassCaptureCooldown?: boolean }} [opts]
 */
async function captureScreenForVision(opts = {}) {
  const bypassCd = opts.bypassCaptureCooldown === true
  if (Date.now() < captureFailCooldownUntil) return null
  if (!bypassCd && Date.now() - lastCaptureTime < CAPTURE_COOLDOWN_MS) {
    return null
  }
  const imageDataUrl = await safeCaptureDataUrl()
  if (!imageDataUrl) return null
  lastCaptureTime = Date.now()
  const prepared = fullFrameFromDataUrl(imageDataUrl)
  return prepared ? prepared.png.toString('base64') : null
}

async function terminateTesseract() {
  if (ocrNodeWorker) {
    try {
      ocrNodeWorker.terminate()
    } catch (_) {}
    ocrNodeWorker = null
  }
  ocrPending.clear()
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate()
    } catch (_) {}
    tesseractWorker = null
  }
}

async function getDesktopSourceId() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 150, height: 84 },
  })
  if (!sources?.length) {
    cachedScreenSourceId = null
    return null
  }
  if (cachedScreenSourceId) {
    const m = sources.find((s) => s.id === cachedScreenSourceId)
    if (m) return m.id
  }
  cachedScreenSourceId = sources[0].id
  return cachedScreenSourceId
}

module.exports = {
  captureScreenText,
  captureScreenForVision,
  getDesktopSourceId,
  initTesseract,
  terminateTesseract,
}
