// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — Android Debug Bridge helpers (device list + screencap for Ask AI).

const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const ADB_BINARIES = process.platform === 'win32' ? ['adb.exe', 'adb'] : ['adb']

async function tryAdbBinary(bin) {
  try {
    await execFileAsync(bin, ['version'], { timeout: 6000, windowsHide: true })
    return bin
  } catch (_) {
    return null
  }
}

async function resolveAdbPath() {
  for (const bin of ADB_BINARIES) {
    const ok = await tryAdbBinary(bin)
    if (ok) return ok
  }
  return null
}

function parseDevicesList(stdout) {
  const lines = String(stdout || '').split(/\r?\n/)
  const out = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('List of devices')) continue
    const parts = trimmed.split(/\s+/)
    const id = parts[0]
    const state = parts[1]
    if (!id || !state || state === 'offline') continue
    if (state !== 'device' && state !== 'authorizing') continue
    let model = ''
    const modelMatch = trimmed.match(/\bmodel:(\S+)/)
    if (modelMatch) model = modelMatch[1].replace(/_/g, ' ')
    out.push({ id, state, model: model || id })
  }
  return out
}

async function listDevices(adbPath) {
  const bin = adbPath || (await resolveAdbPath())
  if (!bin) return { ok: false, error: 'adb not found on PATH', devices: [] }
  try {
    const { stdout } = await execFileAsync(bin, ['devices', '-l'], {
      timeout: 10000,
      windowsHide: true,
    })
    return { ok: true, adbPath: bin, devices: parseDevicesList(stdout) }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), devices: [], adbPath: bin }
  }
}

async function captureScreenPng(adbPath, serial) {
  const bin = adbPath || (await resolveAdbPath())
  if (!bin) throw new Error('adb not found')
  const id = String(serial || '').trim()
  const args = id ? ['-s', id, 'exec-out', 'screencap', '-p'] : ['exec-out', 'screencap', '-p']
  const { stdout } = await execFileAsync(bin, args, {
    encoding: 'buffer',
    maxBuffer: 24 * 1024 * 1024,
    timeout: 20000,
    windowsHide: true,
  })
  if (!stdout?.length || stdout.length < 64) throw new Error('empty screencap')
  return stdout
}

module.exports = {
  resolveAdbPath,
  listDevices,
  captureScreenPng,
  parseDevicesList,
}
