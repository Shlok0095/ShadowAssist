export const SITE = {
  name: 'ShadowAssist',
  repoOwner: 'Shlok0095',
  repoName: 'ShadowAssist',
  get repoUrl() {
    return `https://github.com/${this.repoOwner}/${this.repoName}`
  },
  get releasesLatestUrl() {
    return `${this.repoUrl}/releases/latest`
  },
  get apiLatestRelease() {
    return `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`
  },
} as const
