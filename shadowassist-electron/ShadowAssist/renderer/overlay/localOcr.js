// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Local (renderer-side) OCR pipeline mirroring the previous main-process behavior.

import { createWorker, PSM } from 'tesseract.js'

const CAPTURE_THUMB_W = 1920
const CAPTURE_THUMB_H = 1080
const OCR_MAX_W = 1280
const CAPTURE_COOLDOWN_MS = 1200
const OCR_LOCK_MS = 1500
const MIN_FRAME_SCORE = 3

let tesseractWorker = null
let tesseractInitPromise = null
let ocrInFlightPromise = null
let lastCaptureTime = 0
let captureFailCooldownUntil = 0
let ocrRunningUntil = 0
let lastCompositeScreenHash = ''
let lastRawFrameFingerprint = ''
let lastOcrForSamePng = ''
let captureFailCount = 0
let cachedScreenSourceId = null
let streamCache = null

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function getOcrThumbnailSize() {
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1)
  const sw = Math.max(1, Math.round(window.screen.width * dpr))
  const sh = Math.max(1, Math.round(window.screen.height * dpr))
  return { width: Math.min(CAPTURE_THUMB_W, sw), height: Math.min(CAPTURE_THUMB_H, sh) }
}

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

function simpleByteHash(u8) {
  if (!u8 || !u8.length) return ''
  const n = Math.min(400, u8.length)
  let h = 0
  for (let i = 0; i < n; i++) h = ((h * 31) ^ u8[i]) >>> 0
  return `${n}:${h.toString(36)}`
}

function dataUrlSampleHash(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return ''
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  if (b64.length < 80) return ''
  const sample = `${b64.slice(0, 320)}|${b64.slice(Math.floor(b64.length / 2), Math.floor(b64.length / 2) + 160)}|${b64.slice(-320)}`
  const u8 = new Uint8Array(sample.length)
  for (let j = 0; j < sample.length; j++) u8[j] = sample.charCodeAt(j) & 0xff
  return simpleByteHash(u8)
}

function createCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

function ensureSizedCanvas(canvas, w, h) {
  const width = Math.max(1, Math.round(w))
  const height = Math.max(1, Math.round(h))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  return canvas
}

function prepareFullFrameCanvas(srcCanvas) {
  const width = srcCanvas.width
  const height = srcCanvas.height
  if (width <= OCR_MAX_W) return srcCanvas
  const scale = OCR_MAX_W / Math.max(1, width)
  const out = createCanvas(OCR_MAX_W, Math.round(height * scale))
  const ctx = out.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(srcCanvas, 0, 0, out.width, out.height)
  return out
}

function preprocessCanvasForOcr(srcCanvas) {
  const width = srcCanvas.width
  const height = srcCanvas.height
  if (width < 2 || height < 2) return srcCanvas

  const inCtx = srcCanvas.getContext('2d', { willReadFrequently: true })
  const src = inCtx.getImageData(0, 0, width, height)
  const data = src.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    gray = Math.min(255, Math.max(0, Math.round((gray - 128) * 1.35 + 128)))
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  const grayCanvas = createCanvas(width, height)
  grayCanvas.getContext('2d', { willReadFrequently: true }).putImageData(src, 0, 0)

  const nw = Math.min(1600, Math.round(width * 1.5))
  const nh = Math.max(1, Math.round(height * (nw / Math.max(1, width))))
  const out = createCanvas(nw, nh)
  out.getContext('2d', { willReadFrequently: true }).drawImage(grayCanvas, 0, 0, nw, nh)
  return out
}

async function initTesseractWorker() {
  if (tesseractWorker) return tesseractWorker
  if (tesseractInitPromise) return tesseractInitPromise
  tesseractInitPromise = (async () => {
    const worker = await createWorker('eng', 1, {
      logger: () => {},
      errorHandler: () => {},
    })
    await worker.setParameters({
      tessedit_pageseg_mode: String(PSM.AUTO),
      preserve_interword_spaces: '1',
    })
    tesseractWorker = worker
    return worker
  })()
  try {
    return await tesseractInitPromise
  } finally {
    tesseractInitPromise = null
  }
}

async function getDesktopStream(ipc) {
  const sid = await ipc?.invoke('get-desktop-source-id')
  if (!sid) return null
  if (streamCache && streamCache.sid === sid) {
    const alive = streamCache.stream?.getTracks?.().some((t) => t.readyState === 'live')
    if (alive) return streamCache.stream
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sid } },
    audio: false,
  })
  if (streamCache?.stream) {
    streamCache.stream.getTracks().forEach((t) => t.stop())
  }
  streamCache = { sid, stream }
  return stream
}

async function frameDataUrlFromDesktop(ipc, frameCanvas, videoEl) {
  const stream = await getDesktopStream(ipc)
  if (!stream) return null
  videoEl.srcObject = stream
  videoEl.muted = true
  videoEl.playsInline = true
  try {
    await videoEl.play()
  } catch (_) {
    return null
  }
  const { width, height } = getOcrThumbnailSize()
  const c = ensureSizedCanvas(frameCanvas, width, height)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(videoEl, 0, 0, width, height)
  return c.toDataURL('image/png')
}

async function safeCaptureDataUrl(ipc, frameCanvas, videoEl) {
  for (let i = 0; i < 3; i++) {
    try {
      const d = await frameDataUrlFromDesktop(ipc, frameCanvas, videoEl)
      if (!d || d.length < 80) throw new Error('invalid thumbnail')
      captureFailCount = 0
      return d
    } catch (_) {
      if (i < 2) await sleep(150)
    }
  }
  captureFailCount++
  const delay = Math.min(1000 * 2 ** captureFailCount, 8000)
  captureFailCooldownUntil = Date.now() + delay
  return null
}

export async function captureScreenTextLocal(ipc, opts = {}, runtime = {}) {
  if (ocrInFlightPromise) return ocrInFlightPromise
  const bypassCd = opts.bypassCaptureCooldown === true
  if (Date.now() < captureFailCooldownUntil) return lastOcrForSamePng
  if (Date.now() < ocrRunningUntil) return lastOcrForSamePng
  if (!bypassCd && Date.now() - lastCaptureTime < CAPTURE_COOLDOWN_MS) return lastOcrForSamePng

  const lockToken = Date.now() + OCR_LOCK_MS
  ocrRunningUntil = lockToken
  const frameCanvas = runtime.frameCanvas || (runtime.frameCanvas = createCanvas(2, 2))
  const videoEl = runtime.videoEl || (runtime.videoEl = document.createElement('video'))

  const run = async () => {
    const imageDataUrl = await safeCaptureDataUrl(ipc, frameCanvas, videoEl)
    if (!imageDataUrl) return lastOcrForSamePng
    lastCaptureTime = Date.now()

    const rawFp = fingerprintDataUrl(imageDataUrl)
    if (rawFp && rawFp === lastRawFrameFingerprint && !bypassCd) return lastOcrForSamePng
    lastRawFrameFingerprint = rawFp

    const img = new Image()
    img.decoding = 'async'
    img.src = imageDataUrl
    await img.decode().catch(() => {})

    const srcCanvas = createCanvas(img.naturalWidth || frameCanvas.width, img.naturalHeight || frameCanvas.height)
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })
    srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height)

    const frameCanvasPrepared = prepareFullFrameCanvas(srcCanvas)
    const framePngDataUrl = frameCanvasPrepared.toDataURL('image/png')
    if (!framePngDataUrl || framePngDataUrl.length < 80) return lastOcrForSamePng

    const hash = dataUrlSampleHash(framePngDataUrl)
    if (hash && hash === lastCompositeScreenHash && !bypassCd) return lastOcrForSamePng
    lastCompositeScreenHash = hash

    const processed = preprocessCanvasForOcr(frameCanvasPrepared)
    const processedPng = processed.toDataURL('image/png')
    if (!processedPng || processedPng.length < 40) return lastOcrForSamePng

    const worker = await initTesseractWorker()
    const { data } = await worker.recognize(processedPng)
    const rawText = String(data?.text || '').trim()
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

export async function warmupLocalOcr() {
  try {
    await initTesseractWorker()
  } catch (_) {}
}

export async function terminateLocalOcr() {
  if (streamCache?.stream) {
    streamCache.stream.getTracks().forEach((t) => {
      try {
        t.stop()
      } catch (_) {}
    })
  }
  streamCache = null
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate()
    } catch (_) {}
    tesseractWorker = null
  }
  ocrInFlightPromise = null
}
