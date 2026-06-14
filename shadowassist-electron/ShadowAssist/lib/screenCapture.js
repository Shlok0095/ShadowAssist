// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { desktopCapturer, nativeImage, screen } = require('electron')
const rapidOcr = require('./rapidOcrMain')

/**
 * Full-frame capture: target thumbnail size for desktopCapturer (capped to physical display size below).
 * Downstream OCR still resizes via OCR_MAX_W.
 */
const CAPTURE_THUMB_W = 1920
const CAPTURE_THUMB_H = 1080
/** Max frame width before preprocess (~44% fewer OCR pixels vs 1280→1600 path). */
const OCR_MAX_W = 1200
/** Cap after grayscale + contrast upscale (was 1600). */
const OCR_PREPROCESS_MAX_W = 1200

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
let ocrInFlightPromise = null

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

function simpleByteHash(u8) {
  if (!u8 || !u8.length) return ''
  const n = Math.min(400, u8.length)
  let h = 0
  for (let i = 0; i < n; i++) h = ((h * 31) ^ u8[i]) >>> 0
  return `${n}:${h.toString(36)}`
}

/** Matches overlay localOcr composite-frame skip (sampled base64 fingerprint). */
function pngSampleHash(pngBuffer) {
  if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length < 40) return ''
  const b64 = pngBuffer.toString('base64')
  if (b64.length < 80) return ''
  const sample = `${b64.slice(0, 320)}|${b64.slice(Math.floor(b64.length / 2), Math.floor(b64.length / 2) + 160)}|${b64.slice(-320)}`
  const u8 = new Uint8Array(sample.length)
  for (let j = 0; j < sample.length; j++) u8[j] = sample.charCodeAt(j) & 0xff
  return simpleByteHash(u8)
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

/** Reject failed captures (nearly all black). Do NOT reject bright pages (LeetCode, docs). */
function isMostlyBlackFrame(img) {
  if (!img || img.isEmpty()) return true
  try {
    const { width, height } = img.getSize()
    if (width < 8 || height < 8) return true
    const bmp = img.toBitmap()
    const stride = width * 4
    let dark = 0
    let n = 0
    const yStep = Math.max(1, Math.floor(height / 24))
    const xStep = Math.max(1, Math.floor(width / 24))
    for (let y = 0; y < height; y += yStep) {
      for (let x = 0; x < width; x += xStep) {
        const i = y * stride + x * 4
        if (bmp[i + 1] < 15) dark++
        n++
      }
    }
    if (!n) return true
    return dark / n > 0.92
  } catch (_) {
    return false
  }
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
    const nw = Math.min(OCR_PREPROCESS_MAX_W, Math.round(width * 1.5))
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
  return { png, imageForOcr: png }
}

async function ocrPngBuffer(buf) {
  try {
    return await rapidOcr.recognizePngBuffer(buf)
  } catch (err) {
    console.warn('OCR recognize:', err?.message || err)
    return ''
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
      let pick = null
      if (cachedScreenSourceId) {
        pick = sources.find((s) => s.id === cachedScreenSourceId) || null
      }
      if (!pick) pick = pickScreenSource(sources) || sources[0]
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
  if (ocrInFlightPromise) return ocrInFlightPromise
  const bypassCd = opts.bypassCaptureCooldown === true

  if (Date.now() < captureFailCooldownUntil) return lastOcrForSamePng
  if (Date.now() < ocrRunningUntil) return lastOcrForSamePng
  if (!bypassCd && Date.now() - lastCaptureTime < CAPTURE_COOLDOWN_MS) return lastOcrForSamePng

  const lockToken = Date.now() + OCR_LOCK_MS
  ocrRunningUntil = lockToken

  const run = async () => {
    const imageDataUrl = await safeCaptureDataUrl()
    if (!imageDataUrl) return lastOcrForSamePng

    lastCaptureTime = Date.now()

    const rawFp = fingerprintDataUrl(imageDataUrl)
    if (rawFp && rawFp === lastRawFrameFingerprint && !bypassCd) return lastOcrForSamePng
    lastRawFrameFingerprint = rawFp

    const img = nativeImage.createFromDataURL(imageDataUrl)
    if (img.isEmpty()) return lastOcrForSamePng

    const frameImg = prepareFullFrame(img)
    if (!frameImg) return lastOcrForSamePng
    if (isMostlyBlackFrame(frameImg)) {
      console.warn('[screenCapture] black/empty frame — skip OCR')
      return lastOcrForSamePng
    }

    const framePng = frameImg.toPNG()
    if (!framePng || framePng.length < 80) return lastOcrForSamePng

    const frameBuf = Buffer.isBuffer(framePng) ? framePng : Buffer.from(framePng)
    const frameHash = pngSampleHash(frameBuf)
    if (frameHash && frameHash === lastCompositeScreenHash && !bypassCd) return lastOcrForSamePng
    lastCompositeScreenHash = frameHash

    const processed = preprocessImageForOcr(frameImg)
    const processedPng = processed.toPNG()
    if (!processedPng || processedPng.length < 40) return lastOcrForSamePng

    const buf = Buffer.isBuffer(processedPng) ? processedPng : Buffer.from(processedPng)
    const rawText = (await ocrPngBuffer(buf)).trim()

    if (!rawText || scoreText(rawText) < MIN_FRAME_SCORE) {
      lastOcrForSamePng = ''
      return ''
    }

    if (lastOcrForSamePng && isSemanticallySame(rawText, lastOcrForSamePng)) {
      return lastOcrForSamePng
    }
    lastOcrForSamePng = rawText
    return rawText
  }

  ocrInFlightPromise = run()
    .catch(() => lastOcrForSamePng)
    .finally(() => {
      ocrInFlightPromise = null
      if (ocrRunningUntil === lockToken) ocrRunningUntil = 0
    })
  return ocrInFlightPromise
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

async function terminateOcr() {
  await rapidOcr.terminate()
}

/**
 * Prefer the display under the cursor (meeting window), then primary, else first.
 * Matches Electron `display_id` to `Display.id` when available.
 */
function pickScreenSource(sources) {
  if (!sources?.length) return null
  const tryMatch = (d) => {
    if (!d) return null
    const idStr = String(d.id)
    return (
      sources.find((s) => s.display_id != null && String(s.display_id) === idStr) ||
      null
    )
  }
  return (
    tryMatch(screen.getDisplayNearestPoint(screen.getCursorScreenPoint())) ||
    tryMatch(screen.getPrimaryDisplay()) ||
    sources[0]
  )
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
  const picked = pickScreenSource(sources)
  cachedScreenSourceId = picked ? picked.id : sources[0].id
  return cachedScreenSourceId
}

/**
 * Payload for `setDisplayMediaRequestHandler`: WASAPI loopback on Windows when `audio: 'loopback'`.
 * Renderer should use `getDisplayMedia({ video: true, audio: true })` so this runs (unlike raw `getUserMedia` desktop).
 */
async function getDisplayMediaLoopbackPayload() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 },
  })
  const src = pickScreenSource(sources)
  if (!src) return {}
  return { video: src, audio: 'loopback' }
}

module.exports = {
  captureScreenText,
  captureScreenForVision,
  getDesktopSourceId,
  getDisplayMediaLoopbackPayload,
  initOcr: () => rapidOcr.warmup(),
  terminateOcr,
  /** @deprecated */ terminateTesseract: terminateOcr,
}
