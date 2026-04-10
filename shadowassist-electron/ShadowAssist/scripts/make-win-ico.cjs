/**
 * Build build/app.ico from logo.png — Windows embeds .ico into the exe more reliably than PNG alone.
 */
const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico')

const root = path.join(__dirname, '..')
const logoPath = path.join(root, 'logo.png')
const outDir = path.join(root, 'build')
const outIco = path.join(outDir, 'app.ico')

if (!fs.existsSync(logoPath)) {
  console.error('[make-win-ico] Missing logo.png at project root.')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

pngToIco(logoPath)
  .then((buf) => {
    fs.writeFileSync(outIco, buf)
    console.log('[make-win-ico] Wrote', outIco)
    process.exit(0)
  })
  .catch((err) => {
    console.error('[make-win-ico]', err)
    process.exit(1)
  })
