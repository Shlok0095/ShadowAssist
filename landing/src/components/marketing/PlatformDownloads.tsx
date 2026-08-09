import { LightButton, LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'

const PLATFORMS = [
  {
    id: 'windows',
    name: 'Windows',
    icon: WindowsIcon,
    desc: 'Windows 10 or later — installer or portable exe.',
    primary: { label: 'Installer', href: SITE.downloadSetupExeUrl },
    secondary: { label: 'Portable', href: SITE.downloadPortablePageUrl },
    recommended: true,
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: MacIcon,
    desc: 'Apple Silicon or Intel — unsigned DMG (right-click → Open on first launch).',
    primary: { label: 'Download DMG', href: SITE.downloadMacDmgUrl },
    secondary: { label: 'Download ZIP', href: SITE.downloadMacZipUrl },
    recommended: false,
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: LinuxIcon,
    desc: 'AppImage (portable) or deb for Debian/Ubuntu. Tray needs AppIndicator.',
    primary: { label: 'AppImage', href: SITE.downloadLinuxAppImageUrl },
    secondary: { label: 'deb package', href: SITE.downloadLinuxDebUrl },
    recommended: false,
  },
] as const

export function PlatformDownloads() {
  return (
    <div className="download-pair">
      {PLATFORMS.map((p) => {
        const Icon = p.icon
        return (
          <article key={p.id} className="download-card va-download-card">
            <div className="download-card__head">
              <Icon />
              <h3>{p.name}</h3>
              {p.recommended ? <span className="download-card__rec">Recommended</span> : null}
            </div>
            <p className="download-card__desc">{p.desc}</p>
            <div className="download-card__actions">
              <LightButton href={p.primary.href} variant="primary" size="sm">
                {p.primary.label}
              </LightButton>
              <LightButton href={p.secondary.href} variant="secondary" size="sm">
                {p.secondary.label}
              </LightButton>
            </div>
          </article>
        )
      })}
    </div>
  )
}
