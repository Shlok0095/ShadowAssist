import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { SITE } from '@/config/site'
import brandLogo from '../../../logo.png'

function downloadSectionHref() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#download`
}

const ctaDesktop =
  'marketing-cta inline-flex min-h-9 items-center justify-center rounded-xl border border-[#3f3f46] bg-[#1f1f1f] px-4 font-display text-sm font-semibold tracking-wide text-zinc-50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_28px_-8px_rgba(0,0,0,0.55)] transition-[transform,box-shadow,background-color,border-color] duration-300 hover:scale-[1.03] hover:border-[#52525b] hover:bg-[#2a2a2a] active:scale-[0.99]'

const ctaMobile =
  'marketing-cta inline-flex min-h-9 min-w-[5.5rem] items-center justify-center rounded-xl border border-[#3f3f46] bg-[#1f1f1f] px-3 font-display text-xs font-semibold tracking-wide text-zinc-50 shadow-[0_0_24px_-8px_rgba(0,0,0,0.5)] transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.03] hover:bg-[#2a2a2a] active:scale-[0.99]'

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
              ? 'text-zinc-100'
              : 'text-[#a1a1aa] hover:text-white'
            : isActive
              ? 'text-blue-600'
              : 'text-zinc-600 hover:text-zinc-900'
        )
      }
    >
      {label}
    </NavLink>
  )

  const dropdownLinkClass =
    'block rounded-xl px-4 py-3 text-sm font-medium text-[#e4e4e7] no-underline transition-colors hover:bg-white/[0.06] hover:text-white'

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex w-full max-w-none flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl sm:px-8 md:px-10 md:py-4 lg:px-14 xl:px-16',
        isMarketing ? 'border-[#2a2a2a]/80 bg-[#0a0a0a]/80' : 'border-zinc-200/80 bg-white/85'
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
          className="h-8 w-auto max-w-[9.5rem] object-contain object-left sm:h-9 sm:max-w-[10.5rem]"
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
                isMarketing ? 'text-[#a1a1aa] hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              Download
            </a>
          </>
        ) : null}
        <NavLink
          to="/docs"
          className={({ isActive }) =>
            cn(
              'text-sm font-medium no-underline transition-colors duration-200',
              isMarketing
                ? isActive
                  ? 'text-zinc-100'
                  : 'text-[#a1a1aa] hover:text-white'
                : isActive
                  ? 'text-blue-600'
                  : 'text-zinc-600 hover:text-zinc-900'
            )
          }
        >
          Docs
        </NavLink>
        <a href={SITE.downloadSetupExeUrl} target="_blank" rel="noopener noreferrer" className={ctaDesktop}>
          <span className="hidden lg:inline">Download for Windows</span>
          <span className="lg:hidden">Download</span>
        </a>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden" ref={wrapRef}>
        <a href={SITE.downloadSetupExeUrl} target="_blank" rel="noopener noreferrer" className={ctaMobile}>
          Download
        </a>
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
                ? 'border-[#2a2a2a] bg-[#121212] text-[#a1a1aa] hover:border-zinc-600 hover:text-white'
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
                className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className={cn(
                  'absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] origin-top-right rounded-2xl border p-2 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)] transition-[transform,opacity] duration-200 ease-out',
                  'border-[#2a2a2a]/90 bg-[#121212]/88 backdrop-blur-xl',
                  menuOpen ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-0'
                )}
                role="menu"
              >
                <NavLink to="/" className={dropdownLinkClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/how-it-works" className={dropdownLinkClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  How it works
                </NavLink>
                <NavLink
                  to="/built-for-live-work"
                  className={dropdownLinkClass}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Built for live work
                </NavLink>
                <NavLink to="/docs" className={dropdownLinkClass} role="menuitem" onClick={() => setMenuOpen(false)}>
                  Docs
                </NavLink>
                <a
                  href={downloadSectionHref()}
                  className={dropdownLinkClass}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Download <span className="text-[#71717a]">(on page)</span>
                </a>
                <a
                  href={SITE.downloadSetupExeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="marketing-cta mt-1 block rounded-xl border border-[#3f3f46] bg-[#1f1f1f] px-4 py-3 text-center font-display text-sm font-semibold tracking-wide text-zinc-50 shadow-[0_0_28px_-8px_rgba(0,0,0,0.55)] transition-[transform,background-color] hover:scale-[1.02] hover:bg-[#2a2a2a]"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Download for Windows
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
