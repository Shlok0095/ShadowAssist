// Packaged-build OCR/capture diagnostics (userData/ocr-debug.log).
const fs = require('fs')
const path = require('path')

function ocrDebugLog(event, payload = {}) {
  try {
    const { app } = require('electron')
    if (!app.isPackaged) return
    const p = path.join(app.getPath('userData'), 'ocr-debug.log')
    fs.appendFileSync(p, `${JSON.stringify({ t: Date.now(), event, ...payload })}\n`)
  } catch (_) {}
}

module.exports = { ocrDebugLog }
