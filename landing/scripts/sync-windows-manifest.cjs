const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const repoRoot = path.join(__dirname, '..', '..')
const landingRoot = path.join(__dirname, '..')

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
}

function parseLatestYml(text) {
  const version = text.match(/^version:\s*(\S+)/m)?.[1] || null
  const releaseDate = text.match(/^releaseDate:\s*['"]?([^'"\n]+)/m)?.[1]?.trim() || null
  const installerSize = Number(text.match(/^\s+size:\s*(\d+)/m)?.[1] || 0) || null
  return { version, releaseDate, installerSize }
}

function parseCompactVersion(v) {
  return String(v || '')
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number(n) || 0)
}

function compareCompactVersions(a, b) {
  const pa = parseCompactVersion(a)
  const pb = parseCompactVersion(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (pb[i] || 0) - (pa[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

function compactToDotted(compact) {
  const [y, md, hm] = String(compact).replace(/^v/, '').split('.')
  if (!y || !md || !hm) return String(compact)
  const mdNum = Number(md)
  const hmNum = Number(hm)
  const month = Math.floor(mdNum / 100)
  const day = mdNum % 100
  const hour = Math.floor(hmNum / 100)
  const min = hmNum % 100
  return `${y}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}.${String(hour).padStart(2, '0')}.${String(min).padStart(2, '0')}`
}

function findLatestYml() {
  const candidates = []
  const distYml = path.join(repoRoot, 'dist', 'latest.yml')
  if (fs.existsSync(distYml)) candidates.push(distYml)
  const buildDirs = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (/^dist-fresh-\d+$/.test(d.name) || /^dist-interview-\d+$/.test(d.name)))
    .map((d) => path.join(repoRoot, d.name, 'latest.yml'))
    .filter((p) => fs.existsSync(p))
  candidates.push(...buildDirs)
  if (!candidates.length) return null

  const ranked = candidates
    .map((filePath) => {
      const text = readText(filePath)
      const parsed = text ? parseLatestYml(text) : { version: null }
      return { filePath, version: parsed.version }
    })
    .filter((entry) => entry.version)
    .sort((a, b) => {
      const byVersion = compareCompactVersions(a.version, b.version)
      if (byVersion !== 0) return byVersion
      const score = (p) => {
        if (p.includes(`${path.sep}dist-interview-`)) return 4
        if (p.includes(`${path.sep}dist-fresh-`)) return 3
        if (p.endsWith(`${path.sep}dist${path.sep}latest.yml`)) return 2
        return 1
      }
      return score(b.filePath) - score(a.filePath)
    })

  return ranked[0]?.filePath || null
}

function findExeSize(dir, name) {
  const file = path.join(dir, name)
  if (fs.existsSync(file)) return fs.statSync(file).size
  const compact = fs.readdirSync(dir).find((n) => /^VeilAssistSetup\d/.test(n) && n.endsWith('.exe'))
  if (name === 'VeilAssist-Setup.exe' && compact) return fs.statSync(path.join(dir, compact)).size
  const portable = fs.readdirSync(dir).find((n) => /^VeilAssist\d/.test(n) && n.endsWith('.exe') && !/Setup/.test(n))
  if (name === 'VeilAssist.exe' && portable) return fs.statSync(path.join(dir, portable)).size
  return null
}

function findInstallerExe(dir) {
  if (!dir) return null
  const setup = path.join(dir, 'VeilAssist-Setup.exe')
  if (fs.existsSync(setup)) return setup
  const compact = fs.readdirSync(dir).find((n) => /^VeilAssistSetup\d/.test(n) && n.endsWith('.exe'))
  return compact ? path.join(dir, compact) : null
}

function sha256File(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

const ymlPath = findLatestYml()
if (!ymlPath) {
  console.log('[sync-windows-manifest] no trusted Windows build found — keeping committed manifest')
  process.exit(0)
}
const ymlText = ymlPath ? readText(ymlPath) : null
const yml = ymlText ? parseLatestYml(ymlText) : { version: null, releaseDate: null, installerSize: null }

const versionStatePath = path.join(repoRoot, 'build', 'version-state.json')
let stampVersion = null
try {
  const state = JSON.parse(readText(versionStatePath) || '{}')
  stampVersion = state.last || null
} catch {
  stampVersion = null
}

function findDistDirForYml(ymlPath) {
  return ymlPath ? path.dirname(ymlPath) : null
}

const distDir = findDistDirForYml(ymlPath)
const installerExe = findInstallerExe(distDir)
const portableSize = distDir ? findExeSize(distDir, 'VeilAssist.exe') : null
const installerSize = yml.installerSize || (distDir ? findExeSize(distDir, 'VeilAssist-Setup.exe') : null)
const installerSha256 = sha256File(installerExe)

const compactVersion = yml.version || stampVersion || ''
const releaseTag = compactVersion ? `v${compactVersion}` : 'v2026.820.207'
const repo = 'Shlok0095/VeilAssist'
const releaseBase = `https://github.com/${repo}/releases/download/${releaseTag}`

const manifest = {
  version: compactVersion ? compactToDotted(compactVersion) : stampVersion || '',
  compactVersion: compactVersion || stampVersion || '',
  releaseTag,
  installerDownloadUrl: `${releaseBase}/VeilAssist-Setup.exe`,
  portableDownloadUrl: `${releaseBase}/VeilAssist.exe`,
  builtAt: yml.releaseDate || new Date().toISOString(),
  installerSize: installerSize || 0,
  portableSize: portableSize || 0,
  installerSha256: installerSha256 || '',
}

const publicDir = path.join(landingRoot, 'public', 'downloads')
fs.mkdirSync(publicDir, { recursive: true })
const jsonPath = path.join(publicDir, 'windows-manifest.json')
fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const generatedTs = path.join(landingRoot, 'src', 'config', 'windowsManifest.generated.ts')
fs.writeFileSync(
  generatedTs,
  `/** Auto-generated by scripts/sync-windows-manifest.cjs — do not edit. */\nexport const SITE_WINDOWS_BUILD_MANIFEST = ${JSON.stringify(manifest, null, 2)} as const\n`,
  'utf8',
)

console.log(`[sync-windows-manifest] ${generatedTs}`)
console.log(`[sync-windows-manifest] version=${manifest.version} builtAt=${manifest.builtAt}`)
if (ymlPath) console.log(`[sync-windows-manifest] source ${ymlPath}`)
