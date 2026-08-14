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
console.log('[prepare-mobile-dist] dist-mobile/index.html ready for Capacitor')
