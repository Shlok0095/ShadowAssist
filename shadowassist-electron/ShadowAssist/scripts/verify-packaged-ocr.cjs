// Post-build check: windows-ocr-worker.ps1 must be unpacked and powershell.exe reachable.
const fs = require('fs')
const path = require('path')

const distRoot = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources')
const unpacked = path.join(distRoot, 'app.asar.unpacked')

function mustExist(label, p, minBytes = 1) {
  if (!fs.existsSync(p)) {
    console.error(`[verify-ocr] MISSING ${label}: ${p}`)
    process.exit(1)
  }
  const size = fs.statSync(p).size
  if (size < minBytes) {
    console.error(`[verify-ocr] TOO SMALL ${label}: ${p} (${size} bytes)`)
    process.exit(1)
  }
  console.log(`[verify-ocr] ok  ${label} (${size} bytes)`)
}

mustExist('windows-ocr-worker.ps1', path.join(unpacked, 'scripts', 'windows-ocr-worker.ps1'), 500)

const psPath = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'
)
if (!fs.existsSync(psPath)) {
  console.error(`[verify-ocr] powershell.exe not found at expected path: ${psPath}`)
  process.exit(1)
}
console.log(`[verify-ocr] ok  powershell.exe found`)
console.log('[verify-ocr] all checks passed — Windows OCR ready')
