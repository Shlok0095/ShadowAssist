// Copyright (c) 2026 VeilAssist. All rights reserved.
// Integration tests for lib/win32ExeBranding.js (Task Manager exe branding).
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

const root = path.join(__dirname, '..')
const win32 = require('../lib/win32ExeBranding')

const DISPLAY_NAME = 'Task Host Test Brand'
const ICON_PATH = path.join(root, 'resources', 'brand-presets', 'taskhostw.ico')

let failures = 0

function fail(msg) {
  console.error('FAIL:', msg)
  failures += 1
}

function ok(msg) {
  console.log('OK:', msg)
}

function assert(condition, msg) {
  if (!condition) fail(msg)
  else ok(msg)
}

function readVersionStrings(exePath) {
  const PELibrary = require('pe-library')
  const ResEdit = require('resedit')
  const data = fs.readFileSync(exePath)
  const nt = PELibrary.NtExecutable.from(data)
  const res = PELibrary.NtExecutableResource.from(nt)
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0]
  return {
    cp1200: vi.getStringValues({ lang: 1033, codepage: 1200 }),
    cp1252: vi.getStringValues({ lang: 1033, codepage: 1252 }),
    iconGroups: ResEdit.Resource.IconGroupEntry.fromEntries(res.entries).map((g) => g.id),
  }
}

function copyExeToTemp(name = 'VeilAssist.exe') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-exe-brand-'))
  const dest = path.join(dir, name)
  return { dir, dest }
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (_) {}
}

function testAllowedExecutableNames() {
  assert(win32.isAllowedExecutable('C:\\foo\\VeilAssist.exe'), 'allows VeilAssist.exe')
  assert(win32.isAllowedExecutable('C:\\foo\\electron.exe'), 'allows electron.exe')
  assert(
    win32.isAllowedExecutable(path.join('C:\\foo', 'VeilAssist-branded.exe')),
    'allows VeilAssist-branded.exe cache',
  )
  assert(!win32.isAllowedExecutable('C:\\foo\\malware.exe'), 'rejects unknown exe names')
}

function testPatchUnpackedExe() {
  const src = path.join(root, 'dist', 'win-unpacked', 'VeilAssist.exe')
  if (!fs.existsSync(src)) {
    console.log('SKIP: dist/win-unpacked/VeilAssist.exe not built')
    return
  }
  const { dir, dest } = copyExeToTemp()
  fs.copyFileSync(src, dest)

  const result = win32.patchExecutableResources(dest, {
    displayName: DISPLAY_NAME,
    iconPath: ICON_PATH,
  })
  assert(result.ok, 'patch win-unpacked copy succeeds')

  const meta = readVersionStrings(dest)
  assert(
    meta.cp1200.FileDescription === DISPLAY_NAME,
    `win-unpacked FileDescription cp1200 = ${DISPLAY_NAME}`,
  )
  assert(
    meta.cp1252.FileDescription === DISPLAY_NAME,
    `win-unpacked FileDescription cp1252 = ${DISPLAY_NAME}`,
  )
  assert(meta.iconGroups.length >= 1, 'win-unpacked has icon groups')

  cleanupDir(dir)
}

function testPatchPortableWrapperExe() {
  const src = path.join(root, 'dist', 'VeilAssist.exe')
  if (!fs.existsSync(src)) {
    console.log('SKIP: dist/VeilAssist.exe portable not built')
    return
  }
  const { dir, dest } = copyExeToTemp()
  fs.copyFileSync(src, dest)

  const result = win32.patchExecutableResources(dest, {
    displayName: DISPLAY_NAME,
    iconPath: ICON_PATH,
  })
  assert(result.ok, 'patch portable wrapper copy succeeds')

  const meta = readVersionStrings(dest)
  assert(
    meta.cp1252.FileDescription === DISPLAY_NAME,
    `portable FileDescription cp1252 = ${DISPLAY_NAME}`,
  )
  assert(
    meta.cp1252.ProductName === DISPLAY_NAME,
    `portable ProductName cp1252 = ${DISPLAY_NAME}`,
  )

  cleanupDir(dir)
}

function testBrandedCacheAndSync() {
  const src = path.join(root, 'dist', 'win-unpacked', 'VeilAssist.exe')
  if (!fs.existsSync(src)) {
    console.log('SKIP: branded cache test (no win-unpacked exe)')
    return
  }

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'va-userdata-'))
  const liveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-live-'))
  const liveExe = path.join(liveDir, 'VeilAssist.exe')
  fs.copyFileSync(src, liveExe)

  const cacheResult = win32.refreshBrandedExeCache(userData, liveExe, {
    displayName: DISPLAY_NAME,
    iconPath: ICON_PATH,
  })
  assert(cacheResult.ok, 'refreshBrandedExeCache succeeds')

  const cachePath = win32.getBrandedExeCachePath(userData)
  assert(fs.existsSync(cachePath), 'branded cache file exists')
  assert(!win32.filesEqual(cachePath, liveExe), 'cache differs from pristine live exe before sync')

  const sync = win32.syncBrandedCacheToLiveExe(userData, liveExe)
  assert(sync.ok && sync.synced, 'syncBrandedCacheToLiveExe copies cache to live path')
  assert(win32.filesEqual(cachePath, liveExe), 'live exe matches cache after sync')

  const meta = readVersionStrings(liveExe)
  assert(meta.cp1200.FileDescription === DISPLAY_NAME, 'synced live exe has branded FileDescription')

  cleanupDir(userData)
  cleanupDir(liveDir)
}

function testResolveBrandingTargets() {
  const prevPortable = process.env.PORTABLE_EXECUTABLE_FILE
  const fakePortable = path.join(root, 'dist', 'VeilAssist.exe')
  if (fs.existsSync(fakePortable)) {
    process.env.PORTABLE_EXECUTABLE_FILE = fakePortable
    const targets = win32.resolveBrandingExeTargets({
      execPath: path.join(root, 'dist', 'win-unpacked', 'VeilAssist.exe'),
      appExePath: path.join(root, 'dist', 'win-unpacked', 'VeilAssist.exe'),
    })
    assert(
      targets.includes(fakePortable),
      'resolveBrandingExeTargets includes PORTABLE_EXECUTABLE_FILE',
    )
  } else {
    console.log('SKIP: portable target resolution (no dist/VeilAssist.exe)')
  }
  if (prevPortable === undefined) delete process.env.PORTABLE_EXECUTABLE_FILE
  else process.env.PORTABLE_EXECUTABLE_FILE = prevPortable
}

function testApplyBrandingToExecutable() {
  const src = path.join(root, 'dist', 'win-unpacked', 'VeilAssist.exe')
  if (!fs.existsSync(src)) {
    console.log('SKIP: applyBrandingToExecutable integration')
    return
  }

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'va-userdata-'))
  const liveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-live-'))
  const liveExe = path.join(liveDir, 'VeilAssist.exe')
  fs.copyFileSync(src, liveExe)

  const result = win32.applyBrandingToExecutable({
    exePath: liveExe,
    appExePath: liveExe,
    userDataPath: userData,
    displayName: DISPLAY_NAME,
    iconPath: ICON_PATH,
  })
  assert(result.ok, 'applyBrandingToExecutable returns ok')

  const cachePath = win32.getBrandedExeCachePath(userData)
  assert(fs.existsSync(cachePath), 'applyBrandingToExecutable creates cache')

  const cacheMeta = readVersionStrings(cachePath)
  assert(cacheMeta.cp1200.FileDescription === DISPLAY_NAME, 'cache has branded name after apply')

  cleanupDir(userData)
  cleanupDir(liveDir)
}

function testMainIntegrationHooks() {
  const mainSrc = fs.readFileSync(path.join(root, 'main', 'index.js'), 'utf8')
  assert(mainSrc.includes('maybeSyncBrandedExecutableAndRelaunch'), 'main has portable relaunch sync')
  assert(mainSrc.includes('scheduleDeferredExeBrandingPatchOnQuit'), 'main schedules deferred quit patch')
  assert(mainSrc.includes('win32ExeBranding'), 'main imports win32ExeBranding')
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert(
    pkg.build?.portable?.unpackDirName === 'VeilAssist-v2',
    'package.json portable.unpackDirName is VeilAssist-v2',
  )
  assert(fs.existsSync(path.join(root, 'scripts', 'apply-deferred-exe-branding.cjs')), 'deferred branding script exists')
}

function main() {
  if (process.platform !== 'win32') {
    console.log('OK test-win32-exe-branding (skipped — Windows only)')
    return
  }

  if (!fs.existsSync(ICON_PATH)) {
    fail(`missing icon fixture: ${ICON_PATH}`)
    process.exit(1)
  }

  console.log('[test-win32-exe-branding] starting')
  testAllowedExecutableNames()
  testPatchUnpackedExe()
  testPatchPortableWrapperExe()
  testBrandedCacheAndSync()
  testResolveBrandingTargets()
  testApplyBrandingToExecutable()
  testMainIntegrationHooks()

  if (failures) {
    console.error(`\n[test-win32-exe-branding] FAILED (${failures} failures)`)
    process.exit(1)
  }
  console.log('\n[test-win32-exe-branding] all checks passed')
}

main()
