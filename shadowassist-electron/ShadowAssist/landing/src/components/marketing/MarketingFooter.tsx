import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'
import brandLogo from '../../../../logo.png'

const PRODUCT = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', to: '/docs' },
]

const COMPANY = [
  { label: 'GitHub', href: SITE.repoUrl, external: true },
  { label: 'Releases', href: SITE.releasesRollingUrl, external: true },
  { label: 'Built for live work', to: '/built-for-live-work' },
]

const LEGAL = [
  { label: 'Privacy', to: '/legal/privacy' },
  { label: 'Terms', to: '/legal/terms' },
]

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.205 0 1.59-.015 2.88-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function MarketingFooter() {
  return (
    <footer className="ds-footer">
      <div className="ds-container">
        <div className="ds-footer__grid">
          <div>
            <Link to="/" className="ds-nav__logo">
              <img src={brandLogo} alt={SITE.name} />
            </Link>
            <p className="ds-footer__tagline">
              Undetectable AI for live meetings. Real-time answers, zero bots in the room.
            </p>
          </div>

          <div>
            <p className="ds-footer__col-title">Product</p>
            <ul className="ds-footer__links">
              {PRODUCT.map((l) =>
                'to' in l && l.to ? (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ) : (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <p className="ds-footer__col-title">Company</p>
            <ul className="ds-footer__links">
              {COMPANY.map((l) =>
                'to' in l && l.to ? (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ) : (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <p className="ds-footer__col-title">Legal</p>
            <ul className="ds-footer__links">
              {LEGAL.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ds-footer__bottom">
          <span className="ds-footer__copy">© {new Date().getFullYear()} {SITE.name}. Not affiliated with Groq, OpenAI, or NVIDIA.</span>
          <div className="ds-footer__social">
            <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <GitHubIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
