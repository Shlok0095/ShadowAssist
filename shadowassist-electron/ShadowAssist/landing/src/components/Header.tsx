import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { RippleButton, WindowsIcon } from '@/components/marketing/RippleButton'
import { useNavScroll } from '@/components/marketing/TiltCard'
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
  const scrolled = useNavScroll()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

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
            <a href={SITE.downloadSetupExeUrl} className="font-semibold text-blue-600 no-underline">
              Download
            </a>
          </nav>
        </div>
      </header>
    )
  }

  const linkCls = (active: boolean) => `ds-nav__link${active ? ' active' : ''}`

  return (
    <>
      <header className={`ds-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="ds-nav__inner">
          <NavLink to="/" end className="ds-nav__logo" aria-label={`${SITE.name} home`}>
            <img src={brandLogo} alt="" />
          </NavLink>

          <nav className="ds-nav__links" aria-label="Main">
            {isHome ? (
              <>
                <a href={homeAnchor('how-it-works')} className={linkCls(false)}>
                  How it works
                </a>
                <a href={homeAnchor('features')} className={linkCls(false)}>
                  Features
                </a>
                <a href={homeAnchor('pricing')} className={linkCls(false)}>
                  Pricing
                </a>
              </>
            ) : (
              <>
                <NavLink to="/how-it-works" className={({ isActive }) => linkCls(isActive)}>
                  How it works
                </NavLink>
                <NavLink to="/built-for-live-work" className={({ isActive }) => linkCls(isActive)}>
                  Built for live work
                </NavLink>
              </>
            )}
            <NavLink to="/docs" className={({ isActive }) => linkCls(isActive)}>
              Docs
            </NavLink>
          </nav>

          <div className="ds-nav__cta-desktop">
            <RippleButton href={SITE.downloadSetupExeUrl} size="sm">
              <WindowsIcon />
              Get for Windows
            </RippleButton>
          </div>

          <button
            type="button"
            className="ds-nav__hamburger"
            aria-expanded={drawerOpen}
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      {drawerOpen ? (
        <>
          <button type="button" className="ds-drawer-backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
          <div className="ds-drawer" role="dialog" aria-modal="true">
            <a href={homeAnchor('how-it-works')} className="ds-drawer__link" onClick={() => setDrawerOpen(false)}>
              How it works
            </a>
            <a href={homeAnchor('features')} className="ds-drawer__link" onClick={() => setDrawerOpen(false)}>
              Features
            </a>
            <a href={homeAnchor('pricing')} className="ds-drawer__link" onClick={() => setDrawerOpen(false)}>
              Pricing
            </a>
            <a href={homeAnchor('faq')} className="ds-drawer__link" onClick={() => setDrawerOpen(false)}>
              FAQ
            </a>
            <NavLink to="/docs" className="ds-drawer__link" onClick={() => setDrawerOpen(false)}>
              Docs
            </NavLink>
            <RippleButton href={SITE.downloadSetupExeUrl} size="sm" className="ds-drawer__cta">
              <WindowsIcon />
              Get for Windows
            </RippleButton>
          </div>
        </>
      ) : null}
    </>
  )
}
