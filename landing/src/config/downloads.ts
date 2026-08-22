/**
 * Release artifact discovery for the download center.
 *   The page fetches the public GitHub Releases API for the rolling channels
 *   (`latest-stag`, and `latest` when present) and renders exactly the assets
 *   that exist on those releases — no hardcoded platform lists. New CI builds
 *   appear automatically because the rolling tags are replaced on every push.
 *
 * Fallback behavior (offline / API rate-limited):
 *   A static snapshot of the last-known artifacts is rendered instead, so the
 *   page never breaks. The snapshot only changes when the artifact naming
 *   scheme changes — not per release.
 *
 * No secrets are involved: the GitHub Releases API is public for public repos.
 */

import { SITE } from './site'
import { SITE_ANDROID_APK_MANIFEST } from './apkManifest.generated'
import { SITE_WINDOWS_BUILD_MANIFEST } from './windowsManifest.generated'

export type DownloadPlatform = 'windows' | 'macos' | 'linux' | 'android'
export type DownloadKind = 'installer' | 'portable' | 'archive'

export interface DownloadArtifact {
  fileName: string
  platform: DownloadPlatform
  /** Architecture when the artifact name encodes it (arm64/x64/universal…), else null. */
  arch: string | null
  kind: DownloadKind
  /** Build version extracted from the artifact name (e.g. 2026.08.06.15.01), else null. */
  version: string | null
  size: number | null
  releasedAt: string | null
  downloadUrl: string
  checksum: string | null
}

export interface ReleaseChannel {
  tag: string
  name: string
  prerelease: boolean
  publishedAt: string | null
  htmlUrl: string
  artifacts: DownloadArtifact[]
  checksumsUrl: string | null
}

type RawAsset = {
  name: string
  size: number
  browser_download_url: string
  digest?: string | null
}

type RawRelease = {
  tag_name: string
  name: string
  prerelease: boolean
  published_at: string | null
  html_url: string
  assets: RawAsset[]
}

const ROLLING_BUILD = /(\d{4}(?:\.\d{2}){4})/
const SEMVER = /(\d+\.\d+\.\d+)/
const TAG_VERSION = /^v?(\d{4}\.\d+\.\d+)/

function versionFromTag(tag: string): string | null {
  const match = tag.match(TAG_VERSION)
  return match ? match[1] : null
}

function parseLatestYml(text: string): { version: string; releaseDate: string | null } | null {
  const versionMatch = text.match(/^version:\s*(\S+)/m)
  if (!versionMatch) return null
  const dateMatch = text.match(/^releaseDate:\s*['"]?([^'"\n]+)/m)
  return { version: versionMatch[1], releaseDate: dateMatch?.[1]?.trim() ?? null }
}

function classify(name: string): {
  platform: DownloadPlatform
  arch: string | null
  kind: DownloadKind
  version: string | null
} | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.blockmap')) return null
  if (lower.endsWith('.yml')) return null
  if (lower.startsWith('shadowassist')) return null

  const archMatch = lower.match(/-(arm64|x64|ia32|universal)(?:\.|$)/)
  const arch = archMatch ? archMatch[1] : null
  const buildMatch = lower.match(ROLLING_BUILD)
  const semverMatch = lower.match(SEMVER)
  const version = buildMatch ? buildMatch[1] : semverMatch ? semverMatch[1] : null

  if (lower.endsWith('.exe')) {
    return { platform: 'windows', arch, kind: lower.includes('setup') ? 'installer' : 'portable', version }
  }
  if (lower.endsWith('.dmg') || lower.endsWith('.zip')) {
    return { platform: 'macos', arch, kind: lower.endsWith('.zip') ? 'archive' : 'installer', version }
  }
  if (lower.endsWith('.appimage')) {
    return { platform: 'linux', arch, kind: 'portable', version }
  }
  if (lower.endsWith('.deb') || lower.endsWith('.rpm')) {
    return { platform: 'linux', arch, kind: 'installer', version }
  }
  if (lower.endsWith('.apk')) {
    return { platform: 'android', arch, kind: 'installer', version }
  }
  return null
}

function checksumFromDigest(digest?: string | null): string | null {
  if (!digest) return null
  const value = digest.replace(/^sha256:/i, '').trim()
  return /^[0-9a-f]{64}$/i.test(value) ? value : null
}

export function channelFromRelease(raw: RawRelease): ReleaseChannel {
  const artifacts: DownloadArtifact[] = []
  let checksumsUrl: string | null = null

  for (const asset of raw.assets) {
    if (asset.name.toLowerCase() === 'sha256sums.txt') {
      checksumsUrl = asset.browser_download_url
      continue
    }
    const kind = classify(asset.name)
    if (!kind) continue
    artifacts.push({
      fileName: asset.name,
      platform: kind.platform,
      arch: kind.arch,
      kind: kind.kind,
      version: kind.version,
      size: asset.size,
      releasedAt: raw.published_at,
      downloadUrl: asset.browser_download_url,
      checksum: checksumFromDigest(asset.digest),
    })
  }

  const unique = new Map<string, DownloadArtifact>()
  // Prefer canonical (bare) names when identical binaries are uploaded under
  // several names — e.g. VeilAssist-Setup.exe over VeilAssist-Setup-1.0.1.exe.
  const ordered = [...artifacts].sort((a, b) => {
    const aBare = a.version === null ? 0 : 1
    const bBare = b.version === null ? 0 : 1
    return aBare - bBare
  })
  for (const a of ordered) {
    // Identical files uploaded under multiple names collapse to the first
    // occurrence — derive the key from the checksum when available so
    // duplicate uploads of the same binary never double-render.
    const key = a.checksum
      ? `${a.platform}|${a.kind}|${a.checksum}`
      : `${a.platform}|${a.kind}|${a.fileName.toLowerCase()}`
    const prev = unique.get(key)
    if (!prev) {
      unique.set(key, a)
      continue
    }
    // Keep the bare download URL but inherit build version from the versioned duplicate.
    if (!prev.version && a.version) {
      unique.set(key, { ...prev, version: a.version })
    }
  }

  const deduped = [...unique.values()]
  const tagVersion = versionFromTag(raw.tag_name)
  const knownVersions = deduped.map((a) => a.version).filter((v): v is string => v != null)
  const fallbackVersion = knownVersions.sort().reverse()[0] ?? tagVersion

  return {
    tag: raw.tag_name,
    name: raw.name || raw.tag_name,
    prerelease: raw.prerelease,
    publishedAt: raw.published_at,
    htmlUrl: raw.html_url,
    artifacts: deduped.map((a) => ({
      ...a,
      version: a.version ?? (a.platform === 'windows' ? fallbackVersion : null),
    })),
    checksumsUrl,
  }
}

async function enrichFromLatestYml(channel: ReleaseChannel, url: string): Promise<ReleaseChannel> {
  try {
    const res = await fetch(url)
    if (!res.ok) return channel
    const parsed = parseLatestYml(await res.text())
    if (!parsed) return channel
    return {
      ...channel,
      artifacts: channel.artifacts.map((a) => {
        if (a.platform !== 'windows') return a
        return {
          ...a,
          version: a.version ?? parsed.version,
          releasedAt: parsed.releaseDate ?? a.releasedAt,
        }
      }),
    }
  } catch {
    return channel
  }
}

const API_BASE = 'https://api.github.com'

export function releaseApiUrl(owner: string, repo: string, tag: string) {
  return `${API_BASE}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
}

export async function fetchChannel(owner: string, repo: string, tag: string): Promise<ReleaseChannel | null> {
  const res = await fetch(releaseApiUrl(owner, repo, tag), {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null
  const raw = (await res.json()) as RawRelease
  let channel = channelFromRelease(raw)
  if (channel.artifacts.length === 0) return null

  const ymlAsset = raw.assets.find((a) => a.name.toLowerCase() === 'latest.yml')
  if (ymlAsset) {
    channel = await enrichFromLatestYml(channel, ymlAsset.browser_download_url)
  }
  return applySiteManifests(channel)
}

function applySiteManifests(channel: ReleaseChannel): ReleaseChannel {
  return applySiteWindowsBuild(applySiteAndroidApk(channel))
}

/** Site-hosted Windows build metadata (see windowsManifest.generated.ts). */
export function applySiteWindowsBuild(channel: ReleaseChannel): ReleaseChannel {
  const winVersion = SITE_WINDOWS_BUILD_MANIFEST.version || SITE_WINDOWS_BUILD_MANIFEST.compactVersion
  if (!winVersion) return channel

  return {
    ...channel,
    artifacts: channel.artifacts.map((a) => {
      if (a.platform !== 'windows') return a
      const size =
        a.kind === 'installer'
          ? SITE_WINDOWS_BUILD_MANIFEST.installerSize || a.size
          : SITE_WINDOWS_BUILD_MANIFEST.portableSize || a.size
      const downloadUrl =
        a.kind === 'installer'
          ? SITE_WINDOWS_BUILD_MANIFEST.installerDownloadUrl || a.downloadUrl
          : SITE_WINDOWS_BUILD_MANIFEST.portableDownloadUrl || a.downloadUrl
      return {
        ...a,
        version: winVersion || a.version,
        size: size > 0 ? size : a.size,
        releasedAt: SITE_WINDOWS_BUILD_MANIFEST.builtAt || a.releasedAt,
        downloadUrl,
      }
    }),
  }
}

/** Site-hosted interview APK metadata (see apkManifest.generated.ts). */
export function applySiteAndroidApk(channel: ReleaseChannel): ReleaseChannel {
  const apkVersion = SITE_ANDROID_APK_MANIFEST.version
  const apkSize = SITE_ANDROID_APK_MANIFEST.size > 0 ? SITE_ANDROID_APK_MANIFEST.size : null

  return {
    ...channel,
    artifacts: channel.artifacts.map((a) => {
      if (a.platform !== 'android' || !a.fileName.toLowerCase().endsWith('.apk')) return a
      return {
        ...a,
        downloadUrl: SITE.downloadAndroidApkSiteUrl,
        version: apkVersion || a.version,
        size: apkSize ?? a.size,
        releasedAt: SITE_ANDROID_APK_MANIFEST.builtAt || a.releasedAt,
      }
    }),
  }
}

export function detectPlatform(): DownloadPlatform | null {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/android/i.test(ua)) return 'android'
  if (/windows/i.test(ua) || /win32/i.test(ua)) return 'windows'
  if (/macintosh|mac os x|macintel|macppc/i.test(ua)) return 'macos'
  if (/linux|xf86|x11/i.test(ua)) return 'linux'
  return null
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export const KIND_LABELS: Record<DownloadKind, string> = {
  installer: 'Installer',
  portable: 'Portable',
  archive: 'Archive',
}

export const PLATFORM_LABELS: Record<DownloadPlatform, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
}

/**
 * Last-known artifact snapshot (channel: latest-stag, updated 2026-08-16).
 * Rendered only when the GitHub API is unreachable or rate-limited, so the
 * page never shows an empty state. Refresh when the artifact naming scheme
 * changes — not on every release.
 */
export const FALLBACK_CHANNEL: ReleaseChannel = applySiteManifests({
  tag: 'latest-stag',
  name: 'VeilAssist — latest-stag',
  prerelease: true,
  publishedAt: SITE_WINDOWS_BUILD_MANIFEST.builtAt,
  htmlUrl: 'https://github.com/Shlok0095/VeilAssist/releases/tag/latest-stag',
  artifacts: [
    {
      fileName: 'VeilAssist-Setup.exe',
      platform: 'windows',
      arch: 'x64',
      kind: 'installer',
      version: SITE_WINDOWS_BUILD_MANIFEST.version,
      size: SITE_WINDOWS_BUILD_MANIFEST.installerSize > 0 ? SITE_WINDOWS_BUILD_MANIFEST.installerSize : null,
      releasedAt: SITE_WINDOWS_BUILD_MANIFEST.builtAt,
      downloadUrl: SITE_WINDOWS_BUILD_MANIFEST.installerDownloadUrl,
      checksum: null,
    },
    {
      fileName: 'VeilAssist.exe',
      platform: 'windows',
      arch: 'x64',
      kind: 'portable',
      version: SITE_WINDOWS_BUILD_MANIFEST.version,
      size: SITE_WINDOWS_BUILD_MANIFEST.portableSize > 0 ? SITE_WINDOWS_BUILD_MANIFEST.portableSize : null,
      releasedAt: SITE_WINDOWS_BUILD_MANIFEST.builtAt,
      downloadUrl: SITE_WINDOWS_BUILD_MANIFEST.portableDownloadUrl,
      checksum: null,
    },
    {
      fileName: 'VeilAssist-mac.dmg',
      platform: 'macos',
      arch: null,
      kind: 'installer',
      version: null,
      size: 209220580,
      releasedAt: '2026-08-09T20:13:22Z',
      downloadUrl: 'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/VeilAssist-mac.dmg',
      checksum: null,
    },
    {
      fileName: 'VeilAssist-mac.zip',
      platform: 'macos',
      arch: null,
      kind: 'archive',
      version: null,
      size: 199940995,
      releasedAt: '2026-08-09T20:13:22Z',
      downloadUrl: 'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/VeilAssist-mac.zip',
      checksum: null,
    },
    {
      fileName: 'VeilAssist-linux.AppImage',
      platform: 'linux',
      arch: 'x64',
      kind: 'portable',
      version: null,
      size: 217302321,
      releasedAt: '2026-08-09T20:13:22Z',
      downloadUrl: 'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/VeilAssist-linux.AppImage',
      checksum: null,
    },
    {
      fileName: 'VeilAssist-linux.deb',
      platform: 'linux',
      arch: 'x64',
      kind: 'installer',
      version: null,
      size: 138822562,
      releasedAt: '2026-08-09T20:13:22Z',
      downloadUrl: 'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/VeilAssist-linux.deb',
      checksum: null,
    },
    {
      fileName: 'VeilAssist-Interview.apk',
      platform: 'android',
      arch: null,
      kind: 'installer',
      version: SITE_ANDROID_APK_MANIFEST.version,
      size: SITE_ANDROID_APK_MANIFEST.size > 0 ? SITE_ANDROID_APK_MANIFEST.size : null,
      releasedAt: SITE_ANDROID_APK_MANIFEST.builtAt,
      downloadUrl: SITE.downloadAndroidApkSiteUrl,
      checksum: null,
    },
  ],
  checksumsUrl: 'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/SHA256SUMS.txt',
})
