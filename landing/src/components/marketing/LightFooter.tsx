import { type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { PLATFORMS } from '@/config/platforms'
import { SITE } from '@/config/site'
import { marketingAnchor, scrollToMarketingSection } from '@/utils/marketingNav'
import brandLogo from '../../../../logo.png'

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.205 0 1.59-.015 2.88-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

const FOOTER_ICONS = { windows: WindowsIcon, macos: MacIcon, linux: LinuxIcon } as const

function FooterDownloadLink({
  href,
  label,
  onClick,
}: {
  href: string
  label: string
  onClick?: (e: MouseEvent) => void
}) {
  return (
    <a href={href} className="lm-footer__link" target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {label}
    </a>
  )
}

export function LightFooter() {
  const scrollDownload = (e: MouseEvent) => {
    e.preventDefault()
    if (!scrollToMarketingSection('download')) {
      window.location.href = marketingAnchor('download')
    }
  }

  return (
    <footer className="lm-footer">
      <div className="lm-container">
        <div className="lm-footer__grid">
          <div>
            <Link to="/" className="lm-footer__logo">
              <img src={brandLogo} alt={SITE.name} />
            </Link>
            <p className="lm-footer__tagline">Real-time AI for live meetings — invisible on your screen.</p>
          </div>

          <div>
            <p className="lm-footer__col-label">Product</p>
            <a href={marketingAnchor('how-it-works')} className="lm-footer__link">
              How it works
            </a>
            <a href={marketingAnchor('features')} className="lm-footer__link">
              Features
            </a>
            <Link to="/docs" className="lm-footer__link">
              Docs
            </Link>
          </div>

          <div>
            <p className="lm-footer__col-label">Download</p>
            <a href={marketingAnchor('download')} className="lm-footer__link lm-footer__link--accent" onClick={scrollDownload}>
              All platforms
            </a>
            {PLATFORMS.map((p) => {
              const Icon = FOOTER_ICONS[p.id]
              return (
                <div key={p.id} className="lm-footer__dl-row">
                  <span className="lm-footer__dl-icon">
                    <Icon />
                  </span>
                  <FooterDownloadLink href={p.download.href} label={`Download for ${p.name}`} />
                </div>
              )
            })}
          </div>

          <div>
            <p className="lm-footer__col-label">Resources</p>
            <Link to="/how-it-works" className="lm-footer__link">
              Guide
            </Link>
            <Link to="/built-for-live-work" className="lm-footer__link">
              Built for live work
            </Link>
            <a href={SITE.releasesRollingUrl} className="lm-footer__link" target="_blank" rel="noopener noreferrer">
              Releases
            </a>
          </div>

          <div>
            <p className="lm-footer__col-label">Legal</p>
            <Link to="/legal/privacy" className="lm-footer__link">
              Privacy
            </Link>
            <Link to="/legal/terms" className="lm-footer__link">
              Terms
            </Link>
          </div>
        </div>

        <div className="lm-footer__bottom">
          <div>
            <span className="lm-status">
              <span className="lm-status__dot" aria-hidden />
              All systems operational
            </span>
            <p className="lm-footer__copy" style={{ marginTop: '0.5rem' }}>
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </p>
          </div>
          <div className="lm-footer__socials">
            <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <GitHubIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
