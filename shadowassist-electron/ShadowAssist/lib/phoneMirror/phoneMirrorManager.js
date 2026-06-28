// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — Android mirror via adb + scrcpy (parallel to Phone Link; desktop vision unchanged).

const adbClient = require('./adbClient')
const scrcpyRunner = require('./scrcpyRunner')

/**
 * @param {object} deps
 * @param {(key: string) => any} deps.storeGet
 */
function createPhoneMirrorManager({ storeGet }) {
  /** @type {{ child: import('child_process').ChildProcess, done: Promise<unknown> } | null} */
  let scrcpySession = null
  let mirroring = false
  let lastError = ''
  let activeSerial = ''
  /** @type {string | null} */
  let cachedAdbPath = null
  /** @type {string | null} */
  let cachedScrcpyPath = null

  async function probe() {
    cachedAdbPath = await adbClient.resolveAdbPath()
    cachedScrcpyPath = await scrcpyRunner.resolveScrcpyPath()
    return {
      adbFound: !!cachedAdbPath,
      scrcpyFound: !!cachedScrcpyPath,
      adbPath: cachedAdbPath || '',
      scrcpyPath: cachedScrcpyPath || '',
    }
  }

  async function listDevices() {
    const tools = await probe()
    if (!tools.adbFound) {
      return { ok: false, error: 'Install Android Platform Tools (adb) and add to PATH.', devices: [], ...tools }
    }
    const listed = await adbClient.listDevices(cachedAdbPath)
    return { ...listed, ...tools }
  }

  function resolveSerial() {
    const saved = String(storeGet('phoneMirrorDeviceId') || '').trim()
    return saved
  }

  function resolveMaxSize() {
    const n = Number(storeGet('phoneMirrorMaxSize'))
    return Number.isFinite(n) && n >= 320 ? Math.floor(n) : 1080
  }

  function resolveBitRate() {
    const n = Number(storeGet('phoneMirrorBitRate'))
    return Number.isFinite(n) && n >= 500000 ? Math.floor(n) : 8000000
  }

  async function start(serialOverride) {
    if (mirroring) return { ok: true, alreadyRunning: true, serial: activeSerial }

    const tools = await probe()
    if (!tools.adbFound) return { ok: false, error: 'adb not found — install Android Platform Tools.' }
    if (!tools.scrcpyFound) return { ok: false, error: 'scrcpy not found — install from genymobile.github.io/scrcpy.' }

    const listed = await adbClient.listDevices(cachedAdbPath)
    if (!listed.devices?.length) {
      return { ok: false, error: 'No Android device detected. Enable USB debugging and approve the PC.' }
    }

    let serial = String(serialOverride || resolveSerial() || '').trim()
    if (serial && !listed.devices.some((d) => d.id === serial)) {
      return { ok: false, error: `Device ${serial} not connected.` }
    }
    if (!serial) {
      if (listed.devices.length === 1) serial = listed.devices[0].id
      else return { ok: false, error: 'Multiple devices — pick one in settings.', devices: listed.devices }
    }

    lastError = ''
    try {
      scrcpySession = scrcpyRunner.startScrcpy({
        scrcpyPath: cachedScrcpyPath,
        serial,
        maxSize: resolveMaxSize(),
        bitRate: resolveBitRate(),
      })
      mirroring = true
      activeSerial = serial

      scrcpySession.done
        .then(() => {
          mirroring = false
          activeSerial = ''
          scrcpySession = null
        })
        .catch((e) => {
          lastError = e?.message || String(e)
          mirroring = false
          activeSerial = ''
          scrcpySession = null
        })

      return { ok: true, serial, pid: scrcpySession.child?.pid }
    } catch (e) {
      lastError = e?.message || String(e)
      mirroring = false
      scrcpySession = null
      activeSerial = ''
      return { ok: false, error: lastError }
    }
  }

  function stop() {
    if (scrcpySession) scrcpyRunner.stopScrcpySession(scrcpySession)
    scrcpySession = null
    mirroring = false
    activeSerial = ''
    return { ok: true }
  }

  function isMirroring() {
    return mirroring && !!scrcpySession?.child && !scrcpySession.child.killed
  }

  async function captureScreenshotBase64() {
    if (!isMirroring()) return null
    const tools = await probe()
    if (!tools.adbFound) return null
    const serial = activeSerial || resolveSerial()
    const png = await adbClient.captureScreenPng(cachedAdbPath, serial)
    return png.toString('base64')
  }

  function getStatus() {
    return {
      mirroring: isMirroring(),
      serial: activeSerial || resolveSerial(),
      lastError,
      includeInAsk: storeGet('phoneMirrorIncludeInAsk') === true,
      maxSize: resolveMaxSize(),
      bitRate: resolveBitRate(),
    }
  }

  return {
    probe,
    listDevices,
    start,
    stop,
    isMirroring,
    captureScreenshotBase64,
    getStatus,
  }
}

module.exports = { createPhoneMirrorManager }
