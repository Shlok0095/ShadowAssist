import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { SITE } from '@/config/site'

export function Footer() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === ''

  const linkCls = cn(
    'text-sm no-underline transition-colors duration-200',
    isHome ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
  )

  return (
    <footer
      className={cn(
        'mt-auto border-t px-5 py-12 sm:px-8',
        isHome ? 'border-white/[0.08] bg-night-950/30' : 'border-zinc-200/80'
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <span className={cn('text-sm font-bold', isHome ? 'text-zinc-200' : 'text-zinc-900')}>{SITE.name}</span>
        <span className={cn('hidden sm:inline', isHome ? 'text-zinc-600' : 'text-zinc-300')} aria-hidden>
          ·
        </span>
        <Link to="/legal/terms" className={linkCls}>
          Terms
        </Link>
        <Link to="/legal/privacy" className={linkCls}>
          Privacy
        </Link>
        <span className={cn('hidden sm:inline', isHome ? 'text-zinc-600' : 'text-zinc-300')} aria-hidden>
          ·
        </span>
        <a href={SITE.repoUrl} target="_blank" rel="noreferrer" className={linkCls}>
          Source
        </a>
        <p
          className={cn(
            'text-xs leading-relaxed sm:ml-auto sm:max-w-md sm:text-right',
            isHome ? 'text-zinc-600' : 'text-zinc-500'
          )}
        >
          Not affiliated with Groq, OpenAI, or NVIDIA.
        </p>
      </div>
    </footer>
  )
}
