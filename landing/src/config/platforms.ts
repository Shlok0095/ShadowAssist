import type { ComponentType } from 'react'
import { AndroidIcon, LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'
import { SITE_ANDROID_APK_MANIFEST } from '@/config/apkManifest.generated'
import type { DetectedPlatform } from '@/hooks/useDetectedPlatform'

export type PlatformId = Exclude<DetectedPlatform, 'unknown'>

export type PlatformDownload = {
  id: PlatformId
  name: string
  icon: ComponentType
  desc: string
  download: { label: string; href: string }
  meta?: string
}

export const PLATFORMS: PlatformDownload[] = [
  {
    id: 'windows',
    name: 'Windows',
    icon: WindowsIcon,
    desc: 'Windows 10 or later.',
    download: { label: 'Download', href: SITE.downloadSetupExeUrl },
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: MacIcon,
    desc: 'Apple Silicon or Intel.',
    download: { label: 'Download', href: SITE.downloadMacDmgUrl },
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: LinuxIcon,
    desc: 'Ubuntu, Debian, and most distros.',
    download: { label: 'Download', href: SITE.downloadLinuxAppImageUrl },
  },
  {
    id: 'android',
    name: 'Android',
    icon: AndroidIcon,
    desc: 'Interview app for phone — APK install.',
    download: { label: 'Download APK', href: SITE.downloadAndroidApkSiteUrl },
    meta: `v${SITE_ANDROID_APK_MANIFEST.version} · build ${SITE_ANDROID_APK_MANIFEST.versionCode}`,
  },
]

export function sortPlatformsForUser(preferred: PlatformId): PlatformDownload[] {
  const order: PlatformId[] =
    preferred === 'android'
      ? ['android', 'windows', 'macos', 'linux']
      : preferred === 'windows'
        ? ['windows', 'macos', 'linux', 'android']
        : preferred === 'macos'
          ? ['macos', 'windows', 'linux', 'android']
          : ['linux', 'windows', 'macos', 'android']
  const byId = Object.fromEntries(PLATFORMS.map((p) => [p.id, p])) as Record<PlatformId, PlatformDownload>
  return order.map((id) => byId[id])
}

export function getPlatformById(id: PlatformId) {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0]
}
