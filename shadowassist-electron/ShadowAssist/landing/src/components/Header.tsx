import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { SITE } from '@/config/site'

function hashHref(id: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${id}`
}

export function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === ''

  const navLink = (href: string, label: string) => (
    <a
      href={href}
      className={cn(
        'text-sm font-medium no-underline transition-colors duration-200',
        isHome ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
      )}
    >
      {label}
    </a>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex w-full max-w-none flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl sm:px-6 md:px-8 md:py-4',
        isHome ? 'border-white/[0.08] bg-night-950/75' : 'border-zinc-200/80 bg-white/85'
      )}
    >
      <NavLink
        to="/"
        end
        className={cn(
          'min-w-0 text-base font-bold tracking-tight no-underline',
          isHome ? 'text-white hover:text-white' : 'text-zinc-900 hover:text-zinc-900'
        )}
      >
        {SITE.name}
      </NavLink>
      <nav className="flex max-w-full flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-6">
        {isHome ? (
          <>
            {navLink(hashHref('features'), 'Product')}
            {navLink(hashHref('preview'), 'Preview')}
            {navLink(hashHref('download'), 'Download')}
            {navLink(hashHref('faq'), 'FAQ')}
          </>
        ) : null}
        <NavLink
          to="/docs"
          className={({ isActive }) =>
            cn(
              'text-sm font-medium no-underline transition-colors duration-200',
              isHome
                ? isActive
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
                : isActive
                  ? 'text-blue-600'
                  : 'text-zinc-600 hover:text-zinc-900'
            )
          }
        >
          Docs
        </NavLink>
        <a
          href={SITE.downloadSetupExeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex min-h-10 w-full max-w-[220px] items-center justify-center rounded-full px-4 text-center text-sm font-semibold no-underline transition-[transform,box-shadow] duration-200 sm:w-auto sm:max-w-none sm:min-h-9 hover:scale-[1.02] active:scale-[0.99]',
            isHome
              ? 'bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 text-white shadow-md shadow-violet-500/20 hover:shadow-lg'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          )}
        >
          <span className="hidden sm:inline">Download for Windows</span>
          <span className="sm:hidden">Download</span>
        </a>
      </nav>
    </header>
  )
}
