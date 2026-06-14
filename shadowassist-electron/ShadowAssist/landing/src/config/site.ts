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
  windowsPortable: '/download/windows-portable',
} as const

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
  /** Direct GitHub fallback (stable stag rolling release). */
  get downloadSetupExeDirectUrl() {
    return releaseAssetUrl('VeilAssist-Setup.exe')
  },
  get downloadPortableExeUrl() {
    return releaseAssetUrl('VeilAssist.exe')
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
