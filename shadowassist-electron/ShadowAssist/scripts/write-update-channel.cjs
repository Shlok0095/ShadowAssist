/**
 * Writes build/update-channel.txt for packaged auto-update feed selection (CI per branch).
 * Usage: node scripts/write-update-channel.cjs latest-stag
 */
const fs = require('fs')
const path = require('path')

const channel = String(process.argv[2] || 'latest-stag').trim()
const outDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'update-channel.txt')
fs.writeFileSync(outPath, `${channel}\n`, 'utf8')
console.log('[write-update-channel]', outPath, '→', channel)
