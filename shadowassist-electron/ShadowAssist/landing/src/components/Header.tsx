import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { GlowCta } from '@/components/marketing/GlowCta'
import { SITE } from '@/config/site'
import brandLogo from '../../../logo.png'

function downloadSectionHref() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#download`
}

const ctaDesktop = 'hidden lg:inline-flex'

const ctaMobile = 'inline-flex lg:hidden'

export function Header() {
  const { pathname } = useLocation()
  const isMarketing = pathname === '/' || pathname === '/how-it-works' || pathname === '/built-for-live-work'
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

  const navLinkMarketing = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-sm font-medium no-underline transition-colors duration-200',
          isMarketing
            ? isActive
              ? 'text-white'
              : 'text-zinc-200 hover:text-white'
            : isActive
              ? 'font-semibold text-blue-700'
              : 'text-zinc-900 hover:text-zinc-950'
        )
      }
    >
      {label}
    </NavLink>
  )

  const menuPanelClass = cn(
    'absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] origin-top-right scale-100 rounded-2xl border-2 p-2 opacity-100 shadow-xl',
    isMarketing
      ? 'border-white/[0.08] bg-[#050508]/95 text-zinc-50 ring-1 ring-white/10 backdrop-blur-xl'
      : 'border-zinc-300 bg-white text-zinc-950 ring-1 ring-black/5'
  )

  const menuItemClass = cn(
    'block rounded-xl px-4 py-3 text-sm font-semibold no-underline transition-colors',
    isMarketing
      ? 'text-zinc-50 hover:bg-zinc-800 hover:text-white'
      : 'text-zinc-900 hover:bg-zinc-100 hover:text-black'
  )

  const menuSecondaryClass = isMarketing ? 'text-zinc-400' : 'text-zinc-600'

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex w-full max-w-none flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl sm:px-8 md:px-10 md:py-4 lg:px-14 xl:px-16',
        isMarketing ? 'border-white/[0.06] bg-[#050508]/72' : 'border-zinc-200/80 bg-white/85'
      )}
    >
      <NavLink
        to="/"
        end
        aria-label={SITE.name}
        className={cn(
          'flex min-w-0 shrink-0 items-center no-underline',
          isMarketing ? 'text-white hover:opacity-90' : 'text-zinc-900 hover:opacity-90'
        )}
      >
        <img
          src={brandLogo}
          alt=""
          width={160}
          height={40}
          decoding="async"
          className={cn(
            'h-8 w-auto max-w-[9.5rem] object-contain object-left sm:h-9 sm:max-w-[10.5rem]',
            !isMarketing && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]'
          )}
        />
      </NavLink>

      {/* Desktop */}
      <nav className="hidden flex-wrap items-center gap-x-5 gap-y-2 md:flex md:gap-x-6">
        {isMarketing ? (
          <>
            {navLinkMarketing('/how-it-works', 'How it works')}
            {navLinkMarketing('/built-for-live-work', 'Built for live work')}
            <a
              href={downloadSectionHref()}
              className={cn(
                'text-sm font-medium no-underline transition-colors duration-200',
                isMarketing ? 'text-zinc-200 hover:text-white' : 'text-zinc-900 hover:text-zinc-950'
              )}
            >
              Download
            </a>
          </>
        ) : null}
        {navLinkMarketing('/docs', 'Docs')}
        <GlowCta href={SITE.downloadSetupExeUrl} className="min-h-9 px-4 py-2 text-sm">
          <span className={ctaDesktop}>Download for Windows</span>
          <span className={ctaMobile}>Download</span>
        </GlowCta>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden" ref={wrapRef}>
        <GlowCta href={SITE.downloadSetupExeUrl} className="min-h-9 min-w-[5.5rem] px-3 py-2 text-xs md:hidden">
          Download
        </GlowCta>
        <div className="relative">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Open menu"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
              isMarketing
                ? 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-cyan-500/20 hover:text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
            </span>
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className={cn(
                  'fixed inset-0 z-40 transition-opacity',
                  isMarketing ? 'bg-black/60 backdrop-blur-sm' : 'bg-zinc-900/40 backdrop-blur-sm'
                )}
                onClick={() => setMenuOpen(false)}
              />
              <div className={menuPanelClass} role="menu">
                <NavLink to="/" className={menuItemClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/how-it-works" className={menuItemClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  How it works
                </NavLink>
                <NavLink
                  to="/built-for-live-work"
                  className={menuItemClass}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Built for live work
                </NavLink>
                <NavLink to="/docs" className={menuItemClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  Docs
                </NavLink>
                <a
                  href={downloadSectionHref()}
                  className={menuItemClass}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Download <span className={cn('font-medium', menuSecondaryClass)}>(on page)</span>
                </a>
                <GlowCta
                  href={SITE.downloadSetupExeUrl}
                  className="mt-1 block w-full py-3 text-center text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Download for Windows
                </GlowCta>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
