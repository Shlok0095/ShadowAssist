const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'dist-mobile')
const mobileHtml = path.join(dir, 'mobile.html')
const indexHtml = path.join(dir, 'index.html')

if (!fs.existsSync(mobileHtml)) {
  console.error('[prepare-mobile-dist] Missing dist-mobile/mobile.html — run vite mobile build first.')
  process.exit(1)
}

fs.copyFileSync(mobileHtml, indexHtml)

const publicDir = path.join(__dirname, '..', 'public')
for (const name of ['logo.png', 'favicon.png', 'manifest.webmanifest']) {
  const src = path.join(publicDir, name)
  const dest = path.join(dir, name)
  if (fs.existsSync(src)) fs.copyFileSync(src, dest)
}

// Never bundle the marketing APK inside the Capacitor web assets.
const downloadsDir = path.join(dir, 'downloads')
if (fs.existsSync(downloadsDir)) fs.rmSync(downloadsDir, { recursive: true, force: true })
const strayApk = path.join(dir, 'VeilAssist-Interview.apk')
if (fs.existsSync(strayApk)) fs.unlinkSync(strayApk)

console.log('[prepare-mobile-dist] dist-mobile/index.html ready for Capacitor')
