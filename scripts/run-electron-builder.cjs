// Copyright (c) 2026 VeilAssist. All rights reserved.
// Spawns electron-builder with env that skips code-sign tooling (avoids winCodeSign 7z + symlink failures on Windows).
// Every electron-builder invocation first auto-bumps the build version
// (YYYY.MM.DD.HH.SS) from the committed build/version-state.json, so every
// production build is unique and all OS targets in one run share the version.
//
// electron-builder emits artifacts named with package.json "version", which
// is a SEMVER translation of the build timestamp (see bump-build-version.cjs:
// 2026.08.05.13.04 -> 2026.805.1304). After a successful build the produced
// artifacts are renamed to carry the EXACT version
// (VeilAssist2026.08.05.13.04-arm64.dmg), matching the user-facing format
// `VeilAssist<VersionNumber>.dmg` for every platform and on every machine
// (local and CI alike).
// Update metadata (latest-*.yml): the `version:` field MUST stay the semver
// electron-updater wrote (it parses versions with semver and rejects the
// exact timestamp); only url/path fields (artifact filenames) are rewritten
// to the exact version so the updater does not download a 404.

const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

const bump = require('./bump-build-version.cjs')
if (bump() !== 0) process.exit(1)

function renameArtifactsToExactVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  // Exact timestamp lives in build/version-state.json (single source of truth
  // for artifact names); package.json version is its semver translation and is
  // what electron-builder baked into the artifact filenames (`${version}`).
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
    if (!name.includes(cleaned)) continue
    const from = path.join(dist, name)
    if (!fs.statSync(from).isFile()) continue
    const to = path.join(dist, name.split(cleaned).join(exact))
    fs.renameSync(from, to)
    console.log(`[run-electron-builder] artifact renamed: ${name} -> ${path.basename(to)}`)
  }
  // latest-*.yml metadata: the builder wrote url/path pointing at semver-named
  // artifacts and a semver `version:` field. Rewrite ONLY the filename fields
  // to the exact version (updater must not 404); keep `version:` semver —
  // electron-updater parses it with semver and the local app version is
  // semver, so update comparisons stay like-for-like.
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
const args = process.argv.slice(2)
const r = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})
if (r.status === 0) renameArtifactsToExactVersion()
process.exit(r.status === null ? 1 : r.status)
