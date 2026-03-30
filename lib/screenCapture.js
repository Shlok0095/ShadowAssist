// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { desktopCapturer, nativeImage } = require('electron')
let tesseractWorker = null

/**
 * OCR: Tesseract.js (CPU, WASM) — good baseline. Stronger open-source options if you outgrow it:
 * - PaddleOCR (Python/C++, very accurate; run as sidecar HTTP service)
 * - EasyOCR (Python + PyTorch, heavier)
 * - RapidOCR (ONNX, can run via Node native addons)
 */
async function initTesseract() {
  if (tesseractWorker) return tesseractWorker
  try {
    const Tesseract = require('tesseract.js')
    tesseractWorker = await Tesseract.createWorker('eng', 1, {
      logger: () => {},
      // Without this, tesseract.js re-throws after reject() and crashes the Electron main process.
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

async function captureScreenAsImage() {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
  return sources?.[0]?.thumbnail?.toDataURL('image/png') || null
}

async function captureScreenAsBuffer() {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
  return sources?.[0]?.thumbnail?.toPNG() || null
}

async function captureScreenText() {
  const imageDataUrl = await captureScreenAsImage()
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || imageDataUrl.length < 80) return ''

  let imageForTesseract = imageDataUrl
  try {
    const img = nativeImage.createFromDataURL(imageDataUrl)
    if (img.isEmpty()) return ''
    const png = img.toPNG()
    if (!png || png.length < 80) return ''
    imageForTesseract = png
  } catch {
    return ''
  }

  const worker = await initTesseract()
  if (!worker) return ''
  try {
    const { data } = await worker.recognize(imageForTesseract)
    return (data?.text || '').trim()
  } catch (e) {
    console.warn('OCR recognize:', e?.message || e)
    return ''
  }
}

async function captureScreenForVision() {
  const buffer = await captureScreenAsBuffer()
  return buffer ? buffer.toString('base64') : null
}

async function terminateTesseract() {
  if (tesseractWorker) {
    try { await tesseractWorker.terminate() } catch {}
    tesseractWorker = null
  }
}

async function getDesktopSourceId() {
  const sources = await desktopCapturer.getSources({ types: ['screen'] })
  return sources?.[0]?.id || null
}

module.exports = {
  captureScreenText,
  captureScreenForVision,
  getDesktopSourceId,
  initTesseract,
  terminateTesseract,
}
