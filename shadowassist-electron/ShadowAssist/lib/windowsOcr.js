// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Windows OCR via Windows.Graphics.OCR.OcrEngine (WinRT, built into Windows 10+).
// Runs a persistent PowerShell worker so the OCR engine loads once; repeated calls
// are ~50-150ms instead of ~400ms for a fresh powershell.exe spawn each time.

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const STARTUP_TIMEOUT_MS = 15_000
const REQUEST_TIMEOUT_MS = 8_000

let workerProc = null
let lineBuffer = ''
/** idle | loading | ready | error */
let warmupState = 'idle'
let warmupStartedAt = 0
let lastError = ''
let initPromise = null

// OCR is inherently sequential (one temp PNG per request).
let pendingResolve = null
let pendingReject = null
let pendingTimer = null

// ── Path resolution (dev vs packaged asar) ────────────────────────────────────

function resolveWorkerScript() {
  // Packaged: electron-builder unpacks scripts/ → app.asar.unpacked/scripts/
  try {
    const { app } = require('electron')
    if (app?.isPackaged && process.resourcesPath) {
      const p = path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'windows-ocr-worker.ps1')
      if (fs.existsSync(p)) return p
    }
  } catch (_) {}
  // Dev / tests: relative to this file (lib/ → ../scripts/)
  return path.join(__dirname, '..', 'scripts', 'windows-ocr-worker.ps1')
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function clearPending(reason) {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  if (pendingReject) {
    const r = pendingReject
    pendingResolve = null; pendingReject = null
    r(new Error(reason))
  }
}

function resolvePending(text) {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  if (pendingResolve) {
    const r = pendingResolve
    pendingResolve = null; pendingReject = null
    r(text)
  }
}

function handleWorkerLine(line) {
  line = line.trim()
  if (!line) return
  if (line.startsWith('OK:')) {
    try { resolvePending(Buffer.from(line.slice(3), 'base64').toString('utf8')) }
    catch { resolvePending('') }
  } else if (line.startsWith('ERR:')) {
    clearPending(line.slice(4) || 'Windows OCR error')
  }
}

// ── Worker lifecycle ──────────────────────────────────────────────────────────

function startWorker() {
  return new Promise((resolve, reject) => {
    warmupState = 'loading'
    warmupStartedAt = Date.now()
    lastError = ''

    const scriptPath = resolveWorkerScript()
    const proc = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })

    let startupDone = false

    const startupTimer = setTimeout(() => {
      if (!startupDone) {
        startupDone = true
        lastError = 'Windows OCR worker startup timed out (>15s)'
        warmupState = 'error'
        try { proc.kill() } catch {}
        reject(new Error(lastError))
      }
    }, STARTUP_TIMEOUT_MS)

    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (chunk) => {
      lineBuffer += chunk
      const parts = lineBuffer.split('\n')
      lineBuffer = parts.pop()
      for (const raw of parts) {
        const line = raw.trim()
        if (!line) continue
        if (line === 'READY' && !startupDone) {
          startupDone = true
          clearTimeout(startupTimer)
          workerProc = proc
          warmupState = 'ready'
          console.log(`[windowsOcr] ready in ${Date.now() - warmupStartedAt}ms`)
          resolve()
        } else if (line.startsWith('FATAL:') && !startupDone) {
          startupDone = true
          clearTimeout(startupTimer)
          lastError = line.slice(6)
          warmupState = 'error'
          reject(new Error(lastError))
        } else {
          handleWorkerLine(line)
        }
      }
    })

    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', (d) => {
      const m = d.trim()
      if (m) console.warn('[windowsOcr] stderr:', m)
    })

    proc.on('exit', (code) => {
      if (!startupDone) {
        startupDone = true
        clearTimeout(startupTimer)
        const msg = `Windows OCR worker exited early (code ${code})`
        lastError = msg
        warmupState = 'error'
        reject(new Error(msg))
      } else {
        console.warn('[windowsOcr] worker exited, code:', code)
      }
      if (workerProc === proc) workerProc = null
      warmupState = warmupState === 'ready' ? 'idle' : warmupState
      lineBuffer = ''
      clearPending('OCR worker exited')
    })

    proc.on('error', (err) => {
      if (!startupDone) {
        startupDone = true
        clearTimeout(startupTimer)
        lastError = err.message
        warmupState = 'error'
        reject(err)
      }
      clearPending(`OCR worker error: ${err.message}`)
    })
  })
}

async function ensureWorker() {
  if (workerProc && warmupState === 'ready') return
  if (initPromise) return initPromise
  initPromise = startWorker()
    .catch((e) => { lastError = e?.message || String(e); warmupState = 'error'; throw e })
    .finally(() => { initPromise = null })
  return initPromise
}

// ── Public API (matches rapidOcrMain.js interface) ────────────────────────────

async function recognizePngBuffer(pngBuffer) {
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : null
  if (!buf || buf.length < 40) return ''

  await ensureWorker()
  if (!workerProc) throw new Error('Windows OCR worker is not running')

  const tmpFile = path.join(os.tmpdir(), `sa-ocr-${process.pid}-${Date.now()}.png`)
  fs.writeFileSync(tmpFile, buf)

  return new Promise((resolve, reject) => {
    pendingResolve = resolve
    pendingReject = reject
    pendingTimer = setTimeout(() => {
      pendingResolve = null; pendingReject = null
      try { fs.unlinkSync(tmpFile) } catch {}
      resolve('') // timeout → empty string, not an error, so capture degrades gracefully
    }, REQUEST_TIMEOUT_MS)
    workerProc.stdin.write(`path:${tmpFile}\n`)
  })
}

async function recognizePngDataUrl(dataUrl) {
  const s = String(dataUrl || '')
  const i = s.indexOf(',')
  const b64 = i >= 0 ? s.slice(i + 1) : s
  if (!b64) return ''
  const buf = Buffer.from(b64, 'base64')
  return buf.length ? recognizePngBuffer(buf) : ''
}

async function warmup() {
  await ensureWorker()
}

function isReady() {
  return warmupState === 'ready' && !!workerProc
}

function getWarmupState() {
  return {
    state: warmupState,
    ready: isReady(),
    loadingMs: warmupStartedAt && warmupState === 'loading' ? Date.now() - warmupStartedAt : 0,
    error: lastError || '',
  }
}

async function terminate() {
  clearPending('terminated')
  if (workerProc) {
    try { workerProc.stdin.write('EXIT\n') } catch {}
    await new Promise((r) => setTimeout(r, 150))
    try { workerProc.kill() } catch {}
    workerProc = null
  }
  warmupState = 'idle'
  lastError = ''
  lineBuffer = ''
}

function getDiagnostics() {
  const scriptPath = resolveWorkerScript()
  return {
    engine: 'Windows.Graphics.OCR (WinRT)',
    workerScript: scriptPath,
    workerScriptExists: fs.existsSync(scriptPath),
    workerRunning: !!workerProc,
    ocrReady: isReady(),
    warmup: getWarmupState(),
  }
}

module.exports = {
  recognizePngBuffer,
  recognizePngDataUrl,
  warmup,
  terminate,
  isReady,
  getWarmupState,
  getDiagnostics,
}
