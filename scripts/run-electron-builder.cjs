// Copyright (c) 2026 VeilAssist. All rights reserved.
// Spawns electron-builder with env that skips code-sign tooling (avoids winCodeSign 7z + symlink failures on Windows).
//
// Windows builds (stag/production): no auto-bump — artifact names stay VeilAssist.exe /
// VeilAssist-Setup-${version}.exe so existing CI and landing redirects keep working.
//
// macOS / Linux builds: auto-bump build version (YYYY.MM.DD.HH.SS) and rename artifacts to
// the exact timestamp (VeilAssist2026.08.09.20.30-arm64.dmg). Update metadata url/path
// fields are rewritten; `version:` in latest-*.yml stays semver for electron-updater.

const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

const args = process.argv.slice(2)
const argStr = args.join(' ')
const targetsMacOrLinux =
  /--mac\b|--linux\b/.test(argStr) ||
  /\b(dmg|zip|AppImage|deb)\b/.test(argStr)
const targetsWinOnly =
  /--win\b/.test(argStr) && !/--mac\b/.test(argStr) && !/--linux\b/.test(argStr)
const useVersionBump = targetsMacOrLinux && !targetsWinOnly

if (useVersionBump) {
  const bump = require('./bump-build-version.cjs')
  if (bump() !== 0) process.exit(1)
}

function renameArtifactsToExactVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  let exact = pkg.version
  try {
    const state = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'version-state.json'), 'utf8'))
    if (typeof state?.last === 'string') exact = state.last
  } catch (_) {}
  let cleaned = null
  try {
    cleaned = require('semver').clean(pkg.version, true)
  } catch (_) {}
  if (!cleaned || cleaned === exact) return
  const dist = path.join(__dirname, '..', 'dist')
  if (!fs.existsSync(dist)) return
  for (const name of fs.readdirSync(dist)) {
    if (name.endsWith('.yml') || name.includes('unpacked')) continue
    if (name.endsWith('.exe')) continue
    if (!name.includes(cleaned)) continue
    const from = path.join(dist, name)
    if (!fs.statSync(from).isFile()) continue
    const to = path.join(dist, name.split(cleaned).join(exact))
    fs.renameSync(from, to)
    console.log(`[run-electron-builder] artifact renamed: ${name} -> ${path.basename(to)}`)
  }
  for (const name of fs.readdirSync(dist)) {
    if (!/^latest-.*\.yml$/.test(name)) continue
    const full = path.join(dist, name)
    const content = fs.readFileSync(full, 'utf8')
    if (!content.includes(cleaned)) continue
    const rewritten = content
      .split('\n')
      .map((line) => (line.trim().startsWith('version:') ? line : line.split(cleaned).join(exact)))
      .join('\n')
    fs.writeFileSync(full, rewritten)
    console.log(`[run-electron-builder] ${name} url/path rewritten to exact version (version: kept semver)`)
  }
}

const cli = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js')
const r = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})
if (r.status === 0 && useVersionBump) renameArtifactsToExactVersion()
process.exit(r.status === null ? 1 : r.status)
