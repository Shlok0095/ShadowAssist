const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const landingRoot = path.join(__dirname, '..')
const androidDir = path.join(landingRoot, 'android')
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')

if (!fs.existsSync(gradlew)) {
  console.error('[build-android-apk] Missing gradlew in landing/android')
  process.exit(1)
}

if (process.platform !== 'win32') {
  fs.chmodSync(gradlew, 0o755)
}

console.log('[build-android-apk] Running assembleDebug…')
execSync(`"${gradlew}" assembleDebug`, { cwd: androidDir, stdio: 'inherit' })

require('./copy-android-apk.cjs')
