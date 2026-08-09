/**
 * Build-time config (GitHub Actions / local .env / Vercel).
 * Fallbacks match the primary VeilAssist repo when env is unset.
 */
const repoOwner = import.meta.env.VITE_REPO_OWNER ?? 'Shlok0095'
const repoName = import.meta.env.VITE_REPO_NAME ?? 'VeilAssist'
const rollingTag = import.meta.env.VITE_ROLLING_TAG ?? 'latest-stag'
const siteOrigin = String(import.meta.env.VITE_SITE_ORIGIN ?? '').replace(/\/$/, '')

/**
 * First-party download pathnames — Vercel redirects in landing/vercel.json resolve to GitHub assets.
 */
export const DOWNLOAD_ROUTES = {
  windowsSetup: '/download',
  windowsSetupBeta: '/download/beta',
  windowsPortable: '/download/portable',
  macDmg: '/download/macos',
  macZip: '/download/macos/zip',
  linuxAppImage: '/download/linux',
  linuxDeb: '/download/linux/deb',
} as const

/** App marketing version — keep in sync with electron package.json. */
export const APP_VERSION = '1.0.1'

function releaseAssetUrl(file: string, tag = rollingTag) {
  return `https://github.com/${repoOwner}/${repoName}/releases/download/${tag}/${file}`
}

function vanityDownloadPath(pathname: string) {
  const override = import.meta.env.VITE_DOWNLOAD_SETUP_URL
  if (override) return override
  if (siteOrigin) return `${siteOrigin}${pathname}`
  return pathname
}

export const SITE = {
  name: 'VeilAssist',
  repoOwner,
  repoName,
  rollingTag,
  get repoUrl() {
    return `https://github.com/${this.repoOwner}/${this.repoName}`
  },
  get releasesLatestUrl() {
    return `${this.repoUrl}/releases/tag/latest`
  },
  get releasesRollingUrl() {
    return `${this.repoUrl}/releases/tag/${this.rollingTag}`
  },
  /** Primary installer CTA — beta path on stag, production path on main/latest. */
  get downloadSetupExeUrl() {
    const path =
      rollingTag === 'latest-stag' ? DOWNLOAD_ROUTES.windowsSetupBeta : DOWNLOAD_ROUTES.windowsSetup
    return vanityDownloadPath(path)
  },
  /** Staging / beta installer — vanity /download/beta (Vercel → GitHub latest-stag). */
  get downloadSetupBetaExeUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.windowsSetupBeta)
  },
  /** Portable exe — vanity /download/portable (Vercel → GitHub latest-stag). */
  get downloadPortablePageUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.windowsPortable)
  },
  /** macOS DMG — stable alias from CI (VeilAssist-mac.dmg). */
  get downloadMacDmgUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.macDmg)
  },
  get downloadMacZipUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.macZip)
  },
  /** Linux AppImage / deb — stable aliases from CI. */
  get downloadLinuxAppImageUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.linuxAppImage)
  },
  get downloadLinuxDebUrl() {
    return vanityDownloadPath(DOWNLOAD_ROUTES.linuxDeb)
  },
  /** Direct GitHub fallback (stable stag rolling release). */
  get downloadSetupExeDirectUrl() {
    return releaseAssetUrl('VeilAssist-Setup.exe')
  },
  get downloadPortableExeUrl() {
    return releaseAssetUrl('VeilAssist.exe')
  },
  get downloadMacDmgDirectUrl() {
    return releaseAssetUrl('VeilAssist-mac.dmg')
  },
  get downloadLinuxAppImageDirectUrl() {
    return releaseAssetUrl('VeilAssist-linux.AppImage')
  },
  get checksumsTxtUrl() {
    return releaseAssetUrl('SHA256SUMS.txt')
  },
  get apiRollingRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/tags/${this.rollingTag}`
  },
  get apiLatestRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/tags/latest`
  },
} as const
