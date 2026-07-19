/**
 * Build build/app.ico from logo.png — multi-size for crisp Windows taskbar / exe icon.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico')

const root = path.join(__dirname, '..')
const logoPath = path.join(root, 'logo.png')
const outDir = path.join(root, 'build')
const outIco = path.join(outDir, 'app.ico')

const ICO_SIZES = [256, 128, 64, 48, 32, 16]

if (!fs.existsSync(logoPath)) {
  console.error('[make-win-ico] Missing logo.png at project root.')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

;(async () => {
  try {
    const pngBuffers = await Promise.all(
      ICO_SIZES.map((size) => sharp(logoPath).resize(size, size, { fit: 'fill' }).png().toBuffer()),
    )
    const buf = await pngToIco(pngBuffers)
    fs.writeFileSync(outIco, buf)
    console.log('[make-win-ico] Wrote', outIco, `(${ICO_SIZES.join(', ')}px)`)
    process.exit(0)
  } catch (err) {
    console.error('[make-win-ico]', err)
    process.exit(1)
  }
})()
