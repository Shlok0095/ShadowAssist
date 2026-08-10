// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — spawn scrcpy in its own window (same pattern as scrcpy / PhoneMirror apps).

const { spawn } = require('child_process')
const { resolveBrandNameFromStore } = require('../branding')

const SCRCPY_BINARIES = process.platform === 'win32' ? ['scrcpy.exe', 'scrcpy'] : ['scrcpy']

async function resolveScrcpyPath() {
  const { execFile } = require('child_process')
  const { promisify } = require('util')
  const execFileAsync = promisify(execFile)
  for (const bin of SCRCPY_BINARIES) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 6000, windowsHide: true })
      return bin
    } catch (_) {}
  }
  return null
}

/**
 * @param {object} opts
 * @param {string} opts.scrcpyPath
 * @param {string} [opts.serial]
 * @param {number} [opts.maxSize]
 * @param {number} [opts.bitRate] bits per second
 * @param {string} [opts.windowTitle]
 */
function startScrcpy({ scrcpyPath, serial, maxSize, bitRate, windowTitle = `${resolveBrandNameFromStore()} Phone Mirror` }) {
  if (!scrcpyPath) throw new Error('scrcpy not found')

  const args = [
    '--window-title',
    windowTitle,
    '--no-audio',
    '--stay-awake',
  ]
  const id = String(serial || '').trim()
  if (id) args.push('-s', id)
  const size = Number(maxSize)
  if (Number.isFinite(size) && size >= 320) args.push('--max-size', String(Math.floor(size)))
  const br = Number(bitRate)
  if (Number.isFinite(br) && br >= 500000) args.push('--video-bit-rate', String(Math.floor(br)))

  const child = spawn(scrcpyPath, args, {
    stdio: 'ignore',
    windowsHide: true,
    detached: false,
  })

  let started = false
  let exitError = null

  child.once('spawn', () => {
    started = true
  })

  child.on('error', (err) => {
    exitError = err
  })

  const done = new Promise((resolve, reject) => {
    child.once('exit', (code, signal) => {
      if (!started && exitError) {
        reject(exitError)
        return
      }
      if (code && code !== 0 && !signal) {
        reject(new Error(`scrcpy exited with code ${code}`))
        return
      }
      resolve({ code, signal })
    })
  })

  return { child, done, pid: child.pid }
}

function stopScrcpySession(session) {
  if (!session?.child || session.child.killed) return
  try {
    session.child.kill('SIGTERM')
  } catch (_) {
    try {
      session.child.kill()
    } catch (_) {}
  }
}

module.exports = {
  resolveScrcpyPath,
  startScrcpy,
  stopScrcpySession,
}
