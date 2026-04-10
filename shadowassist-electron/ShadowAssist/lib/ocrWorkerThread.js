// Copyright (c) 2026 ShadowAssist. All rights reserved.
/** Tesseract OCR in a Node worker thread — keeps Electron main thread responsive during recognize(). */

const { parentPort } = require('worker_threads')

let tesseractWorker = null

async function ensureWorker() {
  if (tesseractWorker) return tesseractWorker
  const Tesseract = require('tesseract.js')
  tesseractWorker = await Tesseract.createWorker('eng', 1, {
    logger: () => {},
    errorHandler: (m) => console.warn('[Tesseract worker]', m),
  })
  await tesseractWorker.setParameters({
    tessedit_pageseg_mode: String(Tesseract.PSM.AUTO),
    preserve_interword_spaces: '1',
  })
  return tesseractWorker
}

parentPort.on('message', async (msg) => {
  if (!msg || msg.type !== 'recognize' || msg.id == null) return
  const { id } = msg
  try {
    const buf = Buffer.isBuffer(msg.buffer) ? msg.buffer : Buffer.from(msg.buffer || [])
    if (!buf.length) {
      parentPort.postMessage({ type: 'result', id, ok: true, text: '' })
      return
    }
    const w = await ensureWorker()
    const { data } = await w.recognize(buf)
    parentPort.postMessage({ type: 'result', id, ok: true, text: (data?.text || '').trim() })
  } catch (e) {
    parentPort.postMessage({ type: 'result', id, ok: false, error: e?.message || String(e) })
  }
})
