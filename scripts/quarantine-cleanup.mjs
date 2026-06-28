/**
 * Move verified-unused / dev-only artifacts into _quarantine/ (recoverable).
 * Run from repo root: node scripts/quarantine-cleanup.mjs
 */
import { mkdirSync, renameSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = join(repoRoot, 'shadowassist-electron', 'ShadowAssist')
const stamp = '2026-06-26-v1-cleanup'
const quarantineRoot = join(repoRoot, '_quarantine', stamp)

/** @type {{ from: string, reason: string }[]} */
const moves = [
  { from: join(appRoot, '.natively-0.txt'), reason: 'debug capture dump' },
  { from: join(appRoot, '.natively-1.txt'), reason: 'debug capture dump' },
  { from: join(appRoot, '.natively-2.txt'), reason: 'debug capture dump' },
  { from: join(appRoot, '.natively-3.txt'), reason: 'debug capture dump' },
  { from: join(appRoot, '.test-cache'), reason: 'local STT test model cache' },
  { from: join(appRoot, '.test-tmp'), reason: 'temp test output' },
  { from: join(appRoot, 'debug-out.png'), reason: 'debug screenshot' },
  { from: join(appRoot, 't1.png'), reason: 'debug screenshot' },
  { from: join(appRoot, 't2.png'), reason: 'debug screenshot' },
  { from: join(appRoot, 'logo.prepared.tmp.png'), reason: 'logo prep temp file' },
  { from: join(appRoot, 'onnx-community'), reason: 'accidental local model download (runtime uses userData cache)' },
  { from: join(appRoot, 'Launch-ShadowAssist.cmd'), reason: 'legacy launcher shim → Launch-VeilAssist.cmd' },
  { from: join(appRoot, 'Launch-ShadowAssist-Dev.cmd'), reason: 'legacy launcher shim' },
  { from: join(appRoot, 'Launch-ShadowAssist-Fast.cmd'), reason: 'legacy launcher shim' },
  { from: join(appRoot, 'renderer', 'shared', 'responseIntent.js'), reason: 'orphan; lib/responseIntent.js removed, zero imports' },
  { from: join(appRoot, 'scripts', 'verify-packaged-ocr.cjs'), reason: 'OCR removed; vision-only path' },
  { from: join(appRoot, 'scripts', 'windows-ocr-worker.ps1'), reason: 'OCR removed; vision-only path' },
]

mkdirSync(quarantineRoot, { recursive: true })

const manifest = []
let moved = 0

for (const { from, reason } of moves) {
  if (!existsSync(from)) {
    manifest.push(`SKIP (missing): ${relative(repoRoot, from)} — ${reason}`)
    continue
  }
  const rel = relative(repoRoot, from)
  const dest = join(quarantineRoot, rel)
  mkdirSync(dirname(dest), { recursive: true })
  try {
    renameSync(from, dest)
    manifest.push(`MOVED: ${rel} → _quarantine/${stamp}/${rel}\n  reason: ${reason}`)
    moved++
  } catch (e) {
    manifest.push(`FAIL: ${rel} — ${e?.message || e}`)
  }
}

writeFileSync(join(quarantineRoot, 'manifest.txt'), manifest.join('\n\n') + '\n', 'utf8')
console.log(`[quarantine] moved ${moved} item(s) to ${quarantineRoot}`)
console.log(manifest.join('\n'))
