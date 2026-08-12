// Copyright (c) 2026 VeilAssist. All rights reserved.
// Patch Windows PE resources so Task Manager Processes shows About branding.

'use strict'

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ALLOWED_EXE_NAMES = new Set(['veilassist.exe', 'electron.exe', 'veilassist-branded.exe'])
const PENDING_FILE = 'exe-branding-pending.json'
const BRANDED_EXE_CACHE = 'VeilAssist-branded.exe'
const DEFERRED_PATCH_FILE = 'deferred-exe-patch.json'
const SYNC_RELAUNCH_FLAG = 'brandExeSyncPending'

/** Common StringFileInfo blocks in Electron / electron-builder outputs. */
const VERSION_STRING_TABLES = [
  { lang: 1033, codepage: 1200 },
  { lang: 1033, codepage: 1252 },
  { lang: 0, codepage: 1200 },
]

function isAllowedExecutable(exePath) {
  const base = path.basename(String(exePath || '')).toLowerCase()
  return ALLOWED_EXE_NAMES.has(base)
}

function getBrandDir(userDataPath) {
  return path.join(userDataPath, 'brand')
}

function getBrandedExeCachePath(userDataPath) {
  return path.join(getBrandDir(userDataPath), BRANDED_EXE_CACHE)
}

function getPendingPath(userDataPath) {
  return path.join(getBrandDir(userDataPath), PENDING_FILE)
}

function getDeferredPatchPath(userDataPath) {
  return path.join(getBrandDir(userDataPath), DEFERRED_PATCH_FILE)
}

function readJson(pathname) {
  try {
    if (!fs.existsSync(pathname)) return null
    return JSON.parse(fs.readFileSync(pathname, 'utf8'))
  } catch (_) {
    return null
  }
}

function writeJson(pathname, payload) {
  fs.mkdirSync(path.dirname(pathname), { recursive: true })
  fs.writeFileSync(pathname, JSON.stringify(payload), 'utf8')
}

function clearPending(userDataPath) {
  try {
    const p = getPendingPath(userDataPath)
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch (_) {}
}

function filesEqual(a, b) {
  try {
    const bufA = fs.readFileSync(a)
    const bufB = fs.readFileSync(b)
    if (bufA.length !== bufB.length) return false
    return bufA.equals(bufB)
  } catch (_) {
    return false
  }
}

function patchVersionStrings(vi, displayName, originalFilename) {
  const strings = {
    FileDescription: displayName,
    ProductName: displayName,
    InternalName: displayName,
    OriginalFilename: originalFilename,
  }
  for (const table of VERSION_STRING_TABLES) {
    try {
      vi.setStringValues(table, strings)
    } catch (_) {}
  }
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
      const groupIds = groups.length ? groups.map((g) => g.id) : [1]
      for (const groupId of groupIds) {
        ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
          res.entries,
          groupId,
          1033,
          iconFile.icons.map((item) => item.data),
        )
      }
    }

    if (name) {
      const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries)
      const originalFilename = path.basename(exePath)
      for (const vi of viList) {
        patchVersionStrings(vi, name, originalFilename)
        vi.outputToResourceEntries(res.entries)
      }
    }

    res.outputResource(exe)
    fs.writeFileSync(exePath, Buffer.from(exe.generate()))
    return { ok: true, needsRestart: true, path: exePath }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), path: exePath }
  }
}

function patchExecutableTargets(targets, opts) {
  const results = []
  let anyOk = false
  for (const target of targets) {
    if (!target) continue
    const result = patchExecutableResources(target, opts)
    results.push(result)
    if (result.ok) anyOk = true
  }
  return { ok: anyOk, results, needsRestart: true }
}

/**
 * Build / refresh the branded exe cache (always writable — not the running image).
 */
function refreshBrandedExeCache(userDataPath, sourceExePath, opts) {
  const cachePath = getBrandedExeCachePath(userDataPath)
  if (!sourceExePath || !fs.existsSync(sourceExePath)) {
    return { ok: false, error: 'Source executable not found for cache.' }
  }
  try {
    fs.mkdirSync(getBrandDir(userDataPath), { recursive: true })
    fs.copyFileSync(sourceExePath, cachePath)
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to copy executable for branding cache.' }
  }
  return patchExecutableResources(cachePath, opts)
}

function syncBrandedCacheToLiveExe(userDataPath, liveExePath) {
  const cachePath = getBrandedExeCachePath(userDataPath)
  if (!fs.existsSync(cachePath)) return { ok: false, skipped: true, reason: 'no-cache' }
  if (filesEqual(cachePath, liveExePath)) return { ok: true, skipped: true, reason: 'already-synced' }
  try {
    fs.copyFileSync(cachePath, liveExePath)
    return { ok: true, synced: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to sync branded executable.' }
  }
}

function resolvePortableExecutableFile() {
  const portableFile = String(process.env.PORTABLE_EXECUTABLE_FILE || '').trim()
  if (portableFile && fs.existsSync(portableFile)) return portableFile
  return ''
}

/**
 * Exe paths that should carry Task Manager branding.
 * @param {{ execPath?: string, appExePath?: string }} ctx
 */
function resolveBrandingExeTargets(ctx = {}) {
  const execPath = ctx.execPath || process.execPath
  const targets = new Set()
  if (execPath && isAllowedExecutable(execPath)) targets.add(execPath)
  const appExe = ctx.appExePath
  if (appExe && isAllowedExecutable(appExe) && appExe !== execPath) targets.add(appExe)
  const portableFile = resolvePortableExecutableFile()
  if (portableFile && isAllowedExecutable(portableFile)) targets.add(portableFile)
  return [...targets]
}

function applyBrandingToExecutable(opts) {
  const userDataPath = opts.userDataPath
  const displayName = opts.displayName
  const iconPath = opts.iconPath
  const targets = resolveBrandingExeTargets({
    execPath: opts.exePath,
    appExePath: opts.appExePath,
  })

  const cacheResult = refreshBrandedExeCache(userDataPath, opts.exePath || process.execPath, {
    displayName,
    iconPath,
  })

  const liveResults = patchExecutableTargets(targets, { displayName, iconPath })
  if (liveResults.ok || cacheResult.ok) {
    clearPending(userDataPath)
    return {
      ok: true,
      needsRestart: true,
      cache: cacheResult,
      live: liveResults,
    }
  }

  writeJson(getPendingPath(userDataPath), {
    targets,
    displayName,
    iconPath,
    savedAt: Date.now(),
  })
  return {
    ok: false,
    pending: true,
    needsRestart: true,
    error: liveResults.results?.[0]?.error || cacheResult.error || 'Could not patch executable.',
    cache: cacheResult,
    live: liveResults,
  }
}

function applyPendingBrandingOnStartup(userDataPath, ctx = {}) {
  const pending = readJson(getPendingPath(userDataPath))
  if (!pending) return { ok: false, skipped: true, reason: 'no-pending' }
  const targets = Array.isArray(pending.targets)
    ? pending.targets
    : resolveBrandingExeTargets(ctx)
  const result = patchExecutableTargets(targets, {
    displayName: pending.displayName,
    iconPath: pending.iconPath,
  })
  if (result.ok) clearPending(userDataPath)
  return result
}

function scheduleDeferredExeBrandingPatch(opts) {
  const {
    parentPid,
    userDataPath,
    displayName,
    iconPath,
    targets,
    nodeExecPath,
    scriptPath,
  } = opts
  const configPath = getDeferredPatchPath(userDataPath)
  writeJson(configPath, {
    targets,
    displayName,
    iconPath,
    parentPid,
  })
  try {
    const child = spawn(
      nodeExecPath,
      [scriptPath, String(parentPid), configPath],
      {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
      },
    )
    child.unref()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function noticeFromResult(result) {
  if (!result || result.skipped) return ''
  if (result.ok) {
    return 'Branding saved. Fully quit and reopen the app so Task Manager shows the new name and icon.'
  }
  if (result.pending) {
    return 'Branding saved — it will apply when you quit and reopen the app.'
  }
  if (result.error) {
    return `Task Manager branding: ${result.error}`
  }
  return ''
}

module.exports = {
  SYNC_RELAUNCH_FLAG,
  applyBrandingToExecutable,
  applyPendingBrandingOnStartup,
  patchExecutableResources,
  patchExecutableTargets,
  refreshBrandedExeCache,
  syncBrandedCacheToLiveExe,
  getBrandedExeCachePath,
  resolveBrandingExeTargets,
  resolvePortableExecutableFile,
  scheduleDeferredExeBrandingPatch,
  noticeFromResult,
  isAllowedExecutable,
  filesEqual,
}
