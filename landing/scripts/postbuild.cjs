const fs = require('node:fs')
const path = require('node:path')

const dist = path.join(__dirname, '..', 'dist')
const index = path.join(dist, 'index.html')
const fallback = path.join(dist, '404.html')

if (!fs.existsSync(index)) {
  console.error('[postbuild] dist/index.html missing — run vite build first')
  process.exit(1)
}

fs.copyFileSync(index, fallback)
console.log('[postbuild] copied index.html → 404.html (GitHub Pages SPA routes)')
