const fs = require('fs')
const path = require('path')

const candidates = [
  path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
]

const src = candidates.find((p) => fs.existsSync(p))
if (!src) {
  console.error('[copy-android-apk] No APK found. Run npm run build:android-apk first.')
  process.exit(1)
}

const outDir = path.join(__dirname, '..', 'release-android')
fs.mkdirSync(outDir, { recursive: true })
const dest = path.join(outDir, 'VeilAssist-Interview.apk')
fs.copyFileSync(src, dest)
console.log(`[copy-android-apk] ${dest} (${fs.statSync(dest).size} bytes)`)

const publicDir = path.join(__dirname, '..', 'public', 'downloads')
fs.mkdirSync(publicDir, { recursive: true })
const publicDest = path.join(publicDir, 'VeilAssist-Interview.apk')
fs.copyFileSync(src, publicDest)
console.log(`[copy-android-apk] ${publicDest} (${fs.statSync(publicDest).size} bytes)`)
