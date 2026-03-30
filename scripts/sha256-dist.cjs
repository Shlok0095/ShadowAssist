/**
 * Write dist/SHA256SUMS.txt for Windows artifacts (portable + NSIS installer).
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const dist = path.join(__dirname, '..', 'dist')

if (!fs.existsSync(dist)) {
  console.error('[sha256-dist] Missing dist/ — run npm run dist or npm run dist:release first.')
  process.exit(1)
}

const names = fs
  .readdirSync(dist)
  .filter((n) => n.endsWith('.exe') && !n.includes('unpacked'))

if (names.length === 0) {
  console.error('[sha256-dist] No .exe files in dist/.')
  process.exit(1)
}

const lines = names
  .sort()
  .map((name) => {
    const filePath = path.join(dist, name)
    const buf = fs.readFileSync(filePath)
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    return `${hash}  ${name}`
  })

const outPath = path.join(dist, 'SHA256SUMS.txt')
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8')
console.log('[sha256-dist] Wrote', outPath, `(${names.length} file(s))`)
