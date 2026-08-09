import type { ComponentType } from 'react'
import { LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'
import type { DetectedPlatform } from '@/hooks/useDetectedPlatform'

export type PlatformId = Exclude<DetectedPlatform, 'unknown'>

export type PlatformDownload = {
  id: PlatformId
  name: string
  icon: ComponentType
  desc: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
}

export const PLATFORMS: PlatformDownload[] = [
  {
    id: 'windows',
    name: 'Windows',
    icon: WindowsIcon,
    desc: 'Windows 10 or later — installer or portable exe.',
    primary: { label: 'Installer', href: SITE.downloadSetupExeUrl },
    secondary: { label: 'Portable', href: SITE.downloadPortablePageUrl },
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: MacIcon,
    desc: 'Apple Silicon or Intel — unsigned DMG (right-click → Open on first launch).',
    primary: { label: 'Download DMG', href: SITE.downloadMacDmgUrl },
    secondary: { label: 'Download ZIP', href: SITE.downloadMacZipUrl },
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: LinuxIcon,
    desc: 'AppImage (portable) or deb for Debian/Ubuntu. Tray needs AppIndicator.',
    primary: { label: 'AppImage', href: SITE.downloadLinuxAppImageUrl },
    secondary: { label: 'deb package', href: SITE.downloadLinuxDebUrl },
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
