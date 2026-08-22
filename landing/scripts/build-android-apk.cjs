const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const landingRoot = path.join(__dirname, '..')
const androidDir = path.join(landingRoot, 'android')
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
const localProps = path.join(androidDir, 'local.properties')

function resolveAndroidSdk() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

  const home = os.homedir()
  const candidates = [
    path.join(home, 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(home, 'Library', 'Android', 'sdk'),
    path.join(home, 'Android', 'Sdk'),
  ]
  return candidates.find((p) => fs.existsSync(p))
}

function ensureLocalProperties() {
  if (fs.existsSync(localProps)) return
  const sdk = resolveAndroidSdk()
  if (!sdk) {
    console.error(
      '[build-android-apk] Android SDK not found. Set ANDROID_HOME or install Android Studio.',
    )
    process.exit(1)
  }
  const escaped = sdk.replace(/\\/g, '\\\\')
  fs.writeFileSync(localProps, `sdk.dir=${escaped}\n`, 'utf8')
  console.log(`[build-android-apk] Created local.properties → ${sdk}`)
}

function findJdk21Home() {
  const fromEnv = process.env.JAVA_HOME
  if (fromEnv && /jdk-?21/i.test(fromEnv) && fs.existsSync(fromEnv)) return fromEnv

  const roots = [
    path.join('C:', 'Program Files', 'Microsoft'),
    path.join('C:', 'Program Files', 'Eclipse Adoptium'),
    path.join('C:', 'Program Files', 'Java'),
  ]
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const match = fs
      .readdirSync(root)
      .filter((name) => /jdk-?21/i.test(name))
      .map((name) => path.join(root, name))
      .find((p) => fs.existsSync(path.join(p, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')))
    if (match) return match
  }
  return null
}

function ensureJava21() {
  const jdk21 = findJdk21Home()
  if (!jdk21) {
    console.error(
      '[build-android-apk] Java 21 required. Install OpenJDK 21 or set JAVA_HOME to a JDK 21 path.',
    )
    process.exit(1)
  }
  if (!process.env.JAVA_HOME || !/jdk-?21/i.test(process.env.JAVA_HOME)) {
    process.env.JAVA_HOME = jdk21
    const sep = path.delimiter
    process.env.PATH = `${path.join(jdk21, 'bin')}${sep}${process.env.PATH || ''}`
    console.log(`[build-android-apk] Using JAVA_HOME → ${jdk21}`)
  }
}

if (!fs.existsSync(gradlew)) {
  console.error('[build-android-apk] Missing gradlew in landing/android')
  process.exit(1)
}

ensureLocalProperties()
ensureJava21()

if (process.platform !== 'win32') {
  fs.chmodSync(gradlew, 0o755)
}

console.log('[build-android-apk] Running assembleDebug…')
execSync(`"${gradlew}" assembleDebug`, { cwd: androidDir, stdio: 'inherit' })

require('./copy-android-apk.cjs')
