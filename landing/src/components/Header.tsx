import { NavLink, useLocation } from 'react-router-dom'
import { SITE } from '@/config/site'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link--active' : 'nav-link'

function hashHref(id: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${id}`
}

export function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === ''

  return (
    <header className="top glass-bar">
      <NavLink to="/" className="brand" end>
        {SITE.name}
      </NavLink>
      <nav className="nav">
        {isHome ? (
          <>
            <a className="nav-link" href={hashHref('features')}>
              Product
            </a>
            <a className="nav-link" href={hashHref('compare')}>
              Compare
            </a>
            <a className="nav-link" href={hashHref('byok')}>
              BYOK
            </a>
            <a className="nav-link" href={hashHref('faq')}>
              FAQ
            </a>
          </>
        ) : null}
        <NavLink to="/docs" className={navCls}>
          Docs
        </NavLink>
        <a
          className="nav-link nav-cta"
          href={SITE.downloadSetupExeUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
        <a className="nav-link" href={SITE.repoUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  )
}
