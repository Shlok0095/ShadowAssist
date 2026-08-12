// Copyright (c) 2026 VeilAssist. All rights reserved.
// Wait for parent process exit, then patch exe resources (Task Manager branding).
'use strict'

const fs = require('fs')
const win32ExeBranding = require('../lib/win32ExeBranding')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (_) {
    return false
  }
}

async function waitForPidExit(pid, timeoutMs = 120000) {
  const start = Date.now()
  while (isPidAlive(pid)) {
    if (Date.now() - start > timeoutMs) return false
    await sleep(400)
  }
  return true
}

async function main() {
  const parentPid = Number(process.argv[2])
  const configPath = process.argv[3]
  if (!parentPid || !configPath) process.exit(1)

  await waitForPidExit(parentPid)

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const targets = Array.isArray(config.targets) ? config.targets : []
  const result = win32ExeBranding.patchExecutableTargets(targets, {
    displayName: config.displayName,
    iconPath: config.iconPath,
  })

  try {
    fs.unlinkSync(configPath)
  } catch (_) {}

  if (!result.ok) {
    console.error('[deferred-exe-branding] failed:', result.results)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('[deferred-exe-branding] error:', e?.message || e)
  process.exit(1)
})
