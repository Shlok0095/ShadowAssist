import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { WindowsDownloadButton } from '@/components/marketing/WindowsDownloadButton'
import brandLogo from '../../../logo.png'

function homeAnchor(id: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${id}`
}

export function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === ''
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const anchor = (href: string, label: string) => (
    <a href={href} className="va-nav-link">
      {label}
    </a>
  )

  return (
    <header className="va-header">
      <div className="va-header__inner">
      <NavLink to="/" end className="va-brand" aria-label="VeilAssist home">
        <img src={brandLogo} alt="" width={140} height={36} className="h-8 w-auto object-contain sm:h-9" />
      </NavLink>

      <nav className="hidden items-center gap-8 md:flex">
        {isHome ? (
          <>
            {anchor(homeAnchor('how-it-works'), 'How it works')}
            {anchor(homeAnchor('features'), 'Undetectability')}
          </>
        ) : (
          <>
            <NavLink to="/how-it-works" className="va-nav-link">
              How it works
            </NavLink>
            <NavLink to="/built-for-live-work" className="va-nav-link">
              Built for live work
            </NavLink>
          </>
        )}
        <NavLink to="/docs" className="va-nav-link">
          Docs
        </NavLink>
      </nav>

      <div className="hidden md:block">
        <WindowsDownloadButton size="md" />
      </div>

      <div className="flex items-center gap-2 md:hidden" ref={wrapRef}>
        <WindowsDownloadButton size="md" className="!px-4 !py-2 !text-xs" />
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label="Menu"
          className="va-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
        >
          ⋯
        </button>
        {menuOpen ? (
          <>
            <button type="button" className="va-menu-backdrop" aria-label="Close" onClick={() => setMenuOpen(false)} />
            <div className="va-menu-panel">
              <NavLink to="/" className="va-menu-item" onClick={() => setMenuOpen(false)}>
                Home
              </NavLink>
              <a href={homeAnchor('how-it-works')} className="va-menu-item" onClick={() => setMenuOpen(false)}>
                How it works
              </a>
              <a href={homeAnchor('faq')} className="va-menu-item" onClick={() => setMenuOpen(false)}>
                FAQ
              </a>
              <NavLink to="/docs" className="va-menu-item" onClick={() => setMenuOpen(false)}>
                Docs
              </NavLink>
            </div>
          </>
        ) : null}
      </div>
    </div>
    </header>
  )
}
