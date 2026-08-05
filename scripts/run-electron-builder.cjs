// Copyright (c) 2026 VeilAssist. All rights reserved.
// Spawns electron-builder with env that skips code-sign tooling (avoids winCodeSign 7z + symlink failures on Windows).
// Every electron-builder invocation first auto-bumps the build version
// (YYYY.MM.DD.HH.SS) from the committed build/version-state.json, so every
// production build is unique and all OS targets in one run share the version.
//
// electron-builder semver-cleans the version for the `${version}` filename
// macro (2026.08.05.03.07 -> 2026.8.0-5.3.7). After a successful build the
// produced artifacts are renamed to carry the EXACT version
// (VeilAssist2026.08.05.03.07-arm64.dmg), matching the user-facing format
// `VeilAssist<VersionNumber>.dmg` for every platform and on every machine
// (local and CI alike). Update metadata (latest-*.yml) is deliberately left
// untouched — electron-updater expects the cleaned semver there.

const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

const bump = require('./bump-build-version.cjs')
if (bump() !== 0) process.exit(1)

function renameArtifactsToExactVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  const exact = pkg.version
  let cleaned = null
  try {
    cleaned = require('semver').clean(exact, true)
  } catch (_) {}
  if (!cleaned || cleaned === exact) return
  const dist = path.join(__dirname, '..', 'dist')
  if (!fs.existsSync(dist)) return
  for (const name of fs.readdirSync(dist)) {
    if (name.endsWith('.yml') || name.includes('unpacked')) continue
    if (!name.includes(cleaned)) continue
    const from = path.join(dist, name)
    if (!fs.statSync(from).isFile()) continue
    const to = path.join(dist, name.split(cleaned).join(exact))
    fs.renameSync(from, to)
    console.log(`[run-electron-builder] artifact renamed: ${name} -> ${path.basename(to)}`)
  }
  // latest-*.yml metadata: keep url/path/version consistent with the renamed
  // artifacts, otherwise electron-updater would download a 404. Both sides
  // use the exact version, so update checks compare like-for-like.
  for (const name of fs.readdirSync(dist)) {
    if (!/^latest-.*\.yml$/.test(name)) continue
    const full = path.join(dist, name)
    let content = fs.readFileSync(full, 'utf8')
    if (!content.includes(cleaned)) continue
    content = content.split(cleaned).join(exact)
    fs.writeFileSync(full, content)
    console.log(`[run-electron-builder] ${name} metadata rewritten to exact version`)
  }
}

const cli = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js')
const args = process.argv.slice(2)
const r = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})
if (r.status === 0) renameArtifactsToExactVersion()
process.exit(r.status === null ? 1 : r.status)
