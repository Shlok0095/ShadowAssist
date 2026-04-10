// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Spawns electron-builder with env that skips code-sign tooling (avoids winCodeSign 7z + symlink failures on Windows).

const path = require('path')
const { spawnSync } = require('child_process')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

const cli = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js')
const args = process.argv.slice(2)
const r = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})
process.exit(r.status === null ? 1 : r.status)
