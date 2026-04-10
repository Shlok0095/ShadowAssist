export const SITE = {
  name: 'ShadowAssist',
  repoOwner: 'Shlok0095',
  repoName: 'ShadowAssist',
  /** Windows CI publishes every `stag` push here (prerelease). `releases/latest` ignores prereleases. */
  rollingTag: 'latest-stag',
  get repoUrl() {
    return `https://github.com/${this.repoOwner}/${this.repoName}`
  },
  /** Stable non-prerelease “Latest” release page (may lag stag). */
  get releasesLatestUrl() {
    return `${this.repoUrl}/releases/latest`
  },
  /** Rolling stag build — matches CI `latest-stag` release. */
  get releasesRollingUrl() {
    return `${this.repoUrl}/releases/tag/${this.rollingTag}`
  },
  /** Direct download URLs (no API); filenames must match electron-builder + CI. */
  get downloadSetupExeUrl() {
    return `${this.repoUrl}/releases/download/${this.rollingTag}/ShadowAssist-Setup.exe`
  },
  get downloadPortableExeUrl() {
    return `${this.repoUrl}/releases/download/${this.rollingTag}/ShadowAssist.exe`
  },
  get apiRollingRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/tags/${this.rollingTag}`
  },
  get apiLatestRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`
  },
} as const
