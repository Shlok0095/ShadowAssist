// Copyright (c) 2026 VeilAssist. All rights reserved.
// Cross-platform icon generation:
//   - build/app.ico        Windows (multi-size)
//   - build/app.icns        macOS
//   - build/icons/          Linux icon set (png)
// All generated from logo.png (1024x1024) at project root.
'use strict'

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico')

const root = path.join(__dirname, '..')
const logoPath = path.join(root, 'logo.png')
const outDir = path.join(root, 'build')

const ICO_SIZES = [256, 128, 64, 48, 32, 16]
const ICNS_SIZES = [16, 32, 64, 128, 256, 512, 1024]
const LINUX_SIZES = [512, 256, 128, 64, 48, 32, 16]

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true })
}

function pngNameFor(size, scale) {
  return `icon_${size}x${size}${scale > 1 ? `@${scale}x` : ''}.png`
}

async function resizePng(size, outFile) {
  await sharp(logoPath).resize(size, size, { fit: 'cover' }).png().toFile(outFile)
}

async function buildIco() {
  const files = []
  for (const size of ICO_SIZES) {
    const p = path.join(outDir, `.ico-tmp-${size}.png`)
    await resizePng(size, p)
    files.push(p)
  }
  const ico = await pngToIco(files)
  await fs.promises.writeFile(path.join(outDir, 'app.ico'), ico)
  for (const p of files) fs.promises.unlink(p).catch(() => {})
  console.log('[make-icons] app.ico written')
}

async function buildIcns() {
  // electron-builder accepts a 1024x1024 png and converts it to icns via its
  // bundled icon tooling, but only when the iconset uses the canonical names.
  // We generate the standard .iconset directory ourselves; png2icons is not
  // a dependency, so produce a single high-res png (512@2x = 1024) that
  // electron-builder converts on macOS builds.
  const iconsetDir = path.join(outDir, 'app.iconset')
  await ensureDir(iconsetDir)
  const entries = [
    { size: 16, scale: 1 },
    { size: 16, scale: 2 },
    { size: 32, scale: 1 },
    { size: 32, scale: 2 },
    { size: 128, scale: 1 },
    { size: 128, scale: 2 },
    { size: 256, scale: 1 },
    { size: 256, scale: 2 },
    { size: 512, scale: 1 },
    { size: 512, scale: 2 },
  ]
  for (const { size, scale } of entries) {
    const px = size * scale
    if (!ICNS_SIZES.includes(px)) continue
    await resizePng(px, path.join(iconsetDir, pngNameFor(size, scale)))
  }
  // electron-builder reads icon from `build/icon.icns` when present; keep a
  // 512@2x png as `app.png` for builds that convert it themselves.
  await sharp(logoPath).resize(1024, 1024, { fit: 'cover' }).png().toFile(path.join(outDir, 'app.png'))
  console.log('[make-icons] app.iconset + app.png written (macOS icns converted by electron-builder)')
}

async function buildLinuxIcons() {
  const iconsDir = path.join(outDir, 'icons')
  await ensureDir(iconsDir)
  for (const size of LINUX_SIZES) {
    await resizePng(size, path.join(iconsDir, `${size}x${size}.png`))
  }
  console.log('[make-icons] build/icons written (linux icon set)')
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('[make-icons] Missing logo.png at project root.')
    process.exit(1)
  }
  await ensureDir(outDir)
  await buildIco()
  await buildIcns()
  await buildLinuxIcons()
}

main().catch((err) => {
  console.error('[make-icons] failed:', err)
  process.exit(1)
})
