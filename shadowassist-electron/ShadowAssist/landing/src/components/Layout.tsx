import { NavLink, Outlet } from 'react-router-dom'
import { downloadInstallerSetup } from '@/lib/releases'
import { homeSection } from '@/lib/paths'
import { SITE } from '@/lib/siteConfig'

export function Layout() {
  return (
    <div className="shell">
      <header className="glass-nav">
        <NavLink className="brand" to="/" end>
          VeilAssist
        </NavLink>
        <nav className="nav-links" aria-label="Primary">
          <a href={homeSection('features')}>Product</a>
          <a href={homeSection('byok')}>BYOK</a>
          <NavLink
            to="/docs"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Docs
          </NavLink>
          <a href={homeSection('faq')}>FAQ</a>
          <a href={SITE.repoUrl} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
          <button type="button" className="btn-nav-cta" onClick={() => void downloadInstallerSetup()}>
            Download
          </button>
        </nav>
      </header>

      <main className="main-outlet">
        <Outlet />
      </main>

      <footer className="foot">
        <div className="foot-inner">
          <span className="foot-brand">VeilAssist</span>
          <span className="sep">·</span>
          <NavLink to="/legal/terms">Terms</NavLink>
          <NavLink to="/legal/privacy">Privacy</NavLink>
          <span className="sep">·</span>
          <span>Not affiliated with Groq, OpenAI, or NVIDIA.</span>
        </div>
      </footer>
    </div>
  )
}
