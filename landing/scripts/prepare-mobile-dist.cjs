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

console.log('[prepare-mobile-dist] dist-mobile/index.html ready for Capacitor')
