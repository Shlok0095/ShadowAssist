import type { ComponentType } from 'react'
import { LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'
import { SITE_WINDOWS_BUILD_MANIFEST } from './windowsManifest.generated'
import type { DetectedPlatform } from '@/hooks/useDetectedPlatform'

export type PlatformId = Exclude<DetectedPlatform, 'unknown'>

export type PlatformDownload = {
  id: PlatformId
  name: string
  icon: ComponentType
  desc: string
  download: { label: string; href: string }
}

export const PLATFORMS: PlatformDownload[] = [
  {
    id: 'windows',
    name: 'Windows',
    icon: WindowsIcon,
    desc: 'Windows 10 or later.',
    download: { label: 'Download', href: SITE_WINDOWS_BUILD_MANIFEST.installerDownloadUrl },
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
]

export function sortPlatformsForUser(preferred: PlatformId): PlatformDownload[] {
  const order: PlatformId[] =
    preferred === 'windows'
      ? ['windows', 'macos', 'linux']
      : preferred === 'macos'
        ? ['macos', 'windows', 'linux']
        : ['linux', 'windows', 'macos']
  const byId = Object.fromEntries(PLATFORMS.map((p) => [p.id, p])) as Record<PlatformId, PlatformDownload>
  return order.map((id) => byId[id])
}

export function getPlatformById(id: PlatformId) {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0]
}
