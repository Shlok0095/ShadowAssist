// Copyright (c) 2026 VeilAssist. All rights reserved.
// Auto build-version bump: YYYY.MM.DD.HH.SS, unique per build, never reused.
//   SS = 01 when there is no prior build in this hour, else prior SS + 1.
// Persists to build/version-state.json (git-tracked single source of truth)
// and mirrors the result into package.json "version", which electron-builder
// and app.getVersion() consume everywhere (About, Settings, artifacts,
// installer names, exe/dmg/AppImage/deb metadata, latest-mac.yml).
// Usage: node scripts/bump-build-version.cjs   (escapes: SKIP_BUILD_VERSION=1)

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const STATE_FILE = path.join(ROOT, 'build', 'version-state.json')
const META_FILE = path.join(ROOT, 'build', 'build-version.txt')
const PKG_FILE = path.join(ROOT, 'package.json')
const LOCK_FILE = path.join(ROOT, 'package-lock.json')

const pad = (n) => String(n).padStart(2, '0')

function nowPrefix() {
  const d = new Date()
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${pad(d.getHours())}`
}

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return typeof raw?.last === 'string' ? raw.last : null
  } catch (_) {
    return null
  }
}

function writeState(last) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ last }, null, 2)}\n`, 'utf8')
}

function writePackageJsonVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'))
  // electron-builder semver-cleans package.json "version" in memory
  // (2026.08.05.03.01 -> 2026.8.0-5.3.1) and applies the cleaned value to
  // macOS metadata. These two options are written verbatim into Info.plist,
  // so they carry the exact timestamp string.
  pkg.build = pkg.build || {}
  pkg.build.mac = pkg.build.mac || {}
  // Purge any legacy key (renamed to bundleVersion in electron-builder schema).
  delete pkg.build.mac.buildVersion
  pkg.build.mac.bundleShortVersion = version
  pkg.build.mac.bundleVersion = version
  if (pkg.version !== version) pkg.version = version
  fs.writeFileSync(PKG_FILE, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  // Keep package-lock.json in sync so `npm ci` / `npm install` never see a
  // dirty diff after a build bump (npm re-syncs the lock version otherwise).
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
    if (lock.version !== version || lock.packages?.['']?.version !== version) {
      if (lock.version) lock.version = version
      if (lock.packages?.['']) lock.packages[''].version = version
      fs.writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
    }
  } catch (_) {}
}

function nextVersion(last) {
  const prefix = nowPrefix()
  if (last && last.startsWith(`${prefix}.`)) {
    const prev = parseInt(last.slice(prefix.length + 1), 10)
    if (!Number.isNaN(prev)) return `${prefix}.${pad(prev + 1)}`
  }
  return `${prefix}.01`
}

function main() {
  if (process.env.SKIP_BUILD_VERSION === '1') {
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'))
    console.log(`[build-version] SKIPPED (SKIP_BUILD_VERSION=1) — package.json stays ${pkg.version}`)
    return 0
  }
  const version = nextVersion(readState())
  writeState(version)
  writePackageJsonVersion(version)
  try {
    fs.mkdirSync(path.dirname(META_FILE), { recursive: true })
    fs.writeFileSync(META_FILE, `${version}\n`, 'utf8')
  } catch (_) {}
  console.log(`[build-version] ${version}`)
  return 0
}

main.nextVersion = nextVersion
main.nowPrefix = nowPrefix
module.exports = main

if (require.main === module) {
  const code = main()
  process.exitCode = typeof code === 'number' ? code : 0
}