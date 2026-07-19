/**
 * Square-crop logo.png, copy to derived brand asset locations, rebuild app.ico.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = path.join(root, 'logo.png')

const prep = spawnSync(process.execPath, ['scripts/prepare-logo.mjs'], {
  cwd: root,
  stdio: 'inherit',
})
if (prep.status !== 0) process.exit(prep.status ?? 1)

const overlayLogoPath = path.join(root, 'overlaylogo.png')
if (fs.existsSync(overlayLogoPath)) {
  const prepOverlay = spawnSync(process.execPath, ['scripts/prepare-overlay-logo.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (prepOverlay.status !== 0) process.exit(prepOverlay.status ?? 1)
}

if (!fs.existsSync(logoPath)) {
  console.error('[sync-brand-assets] Missing logo.png at', logoPath)
  process.exit(1)
}

const copies = [
  path.join(root, 'landing', 'public', 'logo.png'),
  path.join(root, 'landing', 'public', 'favicon.png'),
]

for (const dest of copies) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    if (fs.existsSync(dest)) fs.unlinkSync(dest)
    fs.copyFileSync(logoPath, dest)
  } catch (e) {
    console.warn('[sync-brand-assets] copy failed, retrying:', path.relative(root, dest), e?.message || e)
    fs.copyFileSync(logoPath, dest)
  }
  console.log('[sync-brand-assets] Copied →', path.relative(root, dest))
}

const ico = spawnSync(process.execPath, ['scripts/make-win-ico.cjs'], {
  cwd: root,
  stdio: 'inherit',
})
if (ico.status !== 0) process.exit(ico.status ?? 1)

console.log('[sync-brand-assets] OK')
