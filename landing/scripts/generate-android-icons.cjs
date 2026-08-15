const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const landingRoot = path.join(__dirname, '..')
const assetsDir = path.join(landingRoot, 'assets')
const logoSrc = path.join(landingRoot, 'public', 'logo.png')

if (!fs.existsSync(logoSrc)) {
  console.error('[generate-android-icons] Missing public/logo.png')
  process.exit(1)
}

fs.mkdirSync(assetsDir, { recursive: true })
fs.copyFileSync(logoSrc, path.join(assetsDir, 'icon.png'))
fs.copyFileSync(logoSrc, path.join(assetsDir, 'splash.png'))

console.log('[generate-android-icons] Generating Android launcher + splash from brand logo…')
execSync(
  'npx --yes @capacitor/assets generate --android --iconBackgroundColor "#0a0a0b" --splashBackgroundColor "#0a0a0b"',
  { cwd: landingRoot, stdio: 'inherit' },
)
console.log('[generate-android-icons] Done.')
