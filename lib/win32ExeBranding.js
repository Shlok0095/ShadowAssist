// Copyright (c) 2026 VeilAssist. All rights reserved.
// Patch Windows PE resources (icon + version strings) so Task Manager Processes
// shows the same name/icon as Settings → About branding.

'use strict'

const fs = require('fs')
const path = require('path')

const ALLOWED_EXE_NAMES = new Set(['veilassist.exe', 'electron.exe'])
const PENDING_FILE = 'exe-branding-pending.json'

function isAllowedExecutable(exePath) {
  const base = path.basename(String(exePath || '')).toLowerCase()
  return ALLOWED_EXE_NAMES.has(base)
}

function getPendingPath(userDataPath) {
  return path.join(userDataPath, 'brand', PENDING_FILE)
}

function readPending(userDataPath) {
  try {
    const p = getPendingPath(userDataPath)
    if (!fs.existsSync(p)) return null
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (!raw || typeof raw !== 'object') return null
    return raw
  } catch (_) {
    return null
  }
}

function writePending(userDataPath, payload) {
  const dir = path.join(userDataPath, 'brand')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getPendingPath(userDataPath), JSON.stringify(payload, null, 0), 'utf8')
}

function clearPending(userDataPath) {
  try {
    const p = getPendingPath(userDataPath)
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch (_) {}
}

/**
 * @param {string} exePath
 * @param {{ displayName?: string, iconPath?: string }} opts
 */
function patchExecutableResources(exePath, { displayName, iconPath } = {}) {
  if (process.platform !== 'win32') {
    return { ok: false, skipped: true, reason: 'not-windows' }
  }
  if (!exePath || !fs.existsSync(exePath)) {
    return { ok: false, error: 'Executable not found.' }
  }
  if (!isAllowedExecutable(exePath)) {
    return { ok: false, skipped: true, reason: 'unsupported-exe' }
  }

  const name = String(displayName || '').trim()
  const icon = String(iconPath || '').trim()

  try {
    const PELibrary = require('pe-library')
    const ResEdit = require('resedit')

    const data = fs.readFileSync(exePath)
    const exe = PELibrary.NtExecutable.from(data)
    const res = PELibrary.NtExecutableResource.from(exe)

    if (icon && fs.existsSync(icon)) {
      const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icon))
      const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)
      const groupId = groups[0]?.id ?? 1
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        groupId,
        1033,
        iconFile.icons.map((item) => item.data),
      )
    }

    if (name) {
      const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries)
      const vi = viList[0]
      if (vi) {
        const originalFilename = path.basename(exePath)
        vi.setStringValues(
          { lang: 1033, codepage: 1200 },
          {
            FileDescription: name,
            ProductName: name,
            OriginalFilename: originalFilename,
          },
        )
        vi.outputToResourceEntries(res.entries)
      }
    }

    res.outputResource(exe)
    fs.writeFileSync(exePath, Buffer.from(exe.generate()))
    return { ok: true, needsRestart: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

/**
 * Apply branding to the running app's executable (or a pending file on next launch).
 * @param {{ exePath: string, userDataPath: string, displayName: string, iconPath: string }} opts
 */
function applyBrandingToExecutable(opts) {
  const exePath = opts.exePath
  const userDataPath = opts.userDataPath
  const displayName = opts.displayName
  const iconPath = opts.iconPath

  const pending = readPending(userDataPath)
  if (pending?.exePath && pending.exePath !== exePath) {
    clearPending(userDataPath)
  }

  const result = patchExecutableResources(exePath, { displayName, iconPath })
  if (result.ok) {
    clearPending(userDataPath)
    return result
  }

  writePending(userDataPath, {
    exePath,
    displayName,
    iconPath,
    savedAt: Date.now(),
  })
  return {
    ok: false,
    pending: true,
    needsRestart: true,
    error: result.error || 'Could not patch executable while running.',
  }
}

/** Run before the UI starts when a prior patch failed (exe was locked). */
function applyPendingBrandingOnStartup(userDataPath) {
  const pending = readPending(userDataPath)
  if (!pending) return { ok: false, skipped: true, reason: 'no-pending' }
  const exePath = pending.exePath
  if (!exePath || !fs.existsSync(exePath)) {
    clearPending(userDataPath)
    return { ok: false, error: 'Pending branding target missing.' }
  }
  const result = patchExecutableResources(exePath, {
    displayName: pending.displayName,
    iconPath: pending.iconPath,
  })
  if (result.ok) clearPending(userDataPath)
  return result
}

function noticeFromResult(result) {
  if (!result || result.skipped) return ''
  if (result.ok) {
    return 'Executable branding updated. Restart the app so Task Manager shows the new name and icon.'
  }
  if (result.pending) {
    return 'Branding will apply on the next app restart (executable was in use).'
  }
  if (result.error) {
    return `Task Manager branding: ${result.error}`
  }
  return ''
}

module.exports = {
  applyBrandingToExecutable,
  applyPendingBrandingOnStartup,
  patchExecutableResources,
  noticeFromResult,
  isAllowedExecutable,
}
