// Generates PWA icons from the shared brand logo using sharp.
// Run from the webapp/ directory: `node scripts/make-icons.mjs`.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Reuse sharp from the repository root install to avoid a duplicate dependency.
const require = createRequire(import.meta.url)
const sharp = require(path.resolve('..', 'node_modules', 'sharp'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'public', 'logo.png')
const outDir = path.join(root, 'public', 'icons')

const bg = { r: 11, g: 16, b: 32, alpha: 1 } // #0b1020

const targets = [
  { name: 'icon-192.png', size: 192, pad: 0 },
  { name: 'icon-512.png', size: 512, pad: 0 },
  { name: 'apple-touch-icon.png', size: 180, pad: 0 },
  // Maskable needs ~10% safe padding so the logo isn't clipped by mask shapes.
  { name: 'icon-maskable-512.png', size: 512, pad: 0.12 },
]

for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2))
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({
    create: { width: t.size, height: t.size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, t.name))
  console.log('wrote', path.relative(root, path.join(outDir, t.name)))
}
