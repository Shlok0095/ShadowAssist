/**
 * Build-time config (GitHub Actions / local .env).
 * Fallbacks match the primary ShadowAssist repo when env is unset.
 */
const repoOwner = import.meta.env.VITE_REPO_OWNER ?? 'Shlok0095'
const repoName = import.meta.env.VITE_REPO_NAME ?? 'ShadowAssist'
const rollingTag = import.meta.env.VITE_ROLLING_TAG ?? 'latest-stag'

/**
 * First-party download pathnames reserved for a future app origin or reverse proxy.
 * Today all user-facing `href`s use the resolved GitHub asset URLs below.
 */
export const DOWNLOAD_ROUTES = {
  windowsSetup: '/download/windows',
  windowsPortable: '/download/windows-portable',
} as const

function releaseAssetUrl(file: string) {
  return `https://github.com/${repoOwner}/${repoName}/releases/download/${rollingTag}/${file}`
}

export const SITE = {
  name: 'ShadowAssist',
  repoOwner,
  repoName,
  rollingTag,
  get repoUrl() {
    return `https://github.com/${this.repoOwner}/${this.repoName}`
  },
  /** Stable non-prerelease “Latest” release page (may lag rolling stag). */
  get releasesLatestUrl() {
    return `${this.repoUrl}/releases/latest`
  },
  /** Rolling stag build — matches CI `latest-stag` release. */
  get releasesRollingUrl() {
    return `${this.repoUrl}/releases/tag/${this.rollingTag}`
  },
  /** NSIS installer — single source of truth for downloads (no API). */
  get downloadSetupExeUrl() {
    return releaseAssetUrl('ShadowAssist-Setup.exe')
  },
  /** Portable executable — single source of truth for downloads (no API). */
  get downloadPortableExeUrl() {
    return releaseAssetUrl('ShadowAssist.exe')
  },
  /** SHA256SUMS.txt on the rolling release (CI must attach this asset). */
  get checksumsTxtUrl() {
    return releaseAssetUrl('SHA256SUMS.txt')
  },
  get apiRollingRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/tags/${this.rollingTag}`
  },
  get apiLatestRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`
  },
} as const
