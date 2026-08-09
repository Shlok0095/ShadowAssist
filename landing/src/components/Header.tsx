import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PlatformDownloadDrawerLinks, PlatformDownloadMenu } from '@/components/marketing/PlatformDownloadMenu'
import { SITE } from '@/config/site'
import brandLogo from '../../../logo.png'

function homeAnchor(id: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${id}`
}

export function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === ''
  const isMarketing = isHome || pathname === '/how-it-works' || pathname === '/built-for-live-work'
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!isMarketing) {
    return (
      <header className="site-header border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <NavLink to="/" className="font-bold text-zinc-900 no-underline">
            {SITE.name}
          </NavLink>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink to="/docs" className="text-zinc-600 no-underline hover:text-zinc-900">
              Docs
            </NavLink>
            <PlatformDownloadMenu />
          </nav>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className={`lm-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lm-nav__inner">
          <NavLink to="/" end className="lm-nav__logo" aria-label={`${SITE.name} home`}>
            <img src={brandLogo} alt="" />
          </NavLink>

          <nav className="lm-nav__links" aria-label="Main">
            {isHome ? (
              <>
                <a href={homeAnchor('how-it-works')} className="lm-nav__link">
                  Features
                </a>
                <a href={homeAnchor('features')} className="lm-nav__link">
                  Undetectability
                </a>
                <a href={homeAnchor('faq')} className="lm-nav__link">
                  FAQ
                </a>
              </>
            ) : (
              <>
                <NavLink to="/how-it-works" className="lm-nav__link">
                  How it works
                </NavLink>
                <NavLink to="/built-for-live-work" className="lm-nav__link">
                  Built for live work
                </NavLink>
              </>
            )}
            <NavLink to="/docs" className="lm-nav__link">
              Docs
            </NavLink>
          </nav>

          <div className="lm-nav__actions">
            <PlatformDownloadMenu className="lm-nav__download" />
            <button
              type="button"
              className="lm-nav__menu-btn"
              aria-expanded={drawerOpen}
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <>
          <button type="button" className="lm-drawer-backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
          <div className="lm-drawer" role="dialog" aria-modal="true">
            <a href={homeAnchor('how-it-works')} className="lm-drawer__link" onClick={() => setDrawerOpen(false)}>
              How it works
            </a>
            <a href={homeAnchor('features')} className="lm-drawer__link" onClick={() => setDrawerOpen(false)}>
              Features
            </a>
            <a href={homeAnchor('faq')} className="lm-drawer__link" onClick={() => setDrawerOpen(false)}>
              FAQ
            </a>
            <NavLink to="/docs" className="lm-drawer__link" onClick={() => setDrawerOpen(false)}>
              Docs
            </NavLink>
            <PlatformDownloadDrawerLinks onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      ) : null}
    </>
  )
}
