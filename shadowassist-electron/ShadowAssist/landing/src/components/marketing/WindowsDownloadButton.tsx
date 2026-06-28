import { cn } from '@/components/ui/cn'
import { SITE } from '@/config/site'

type Props = {
  className?: string
  size?: 'md' | 'lg'
}

export function WindowsDownloadButton({ className, size = 'lg' }: Props) {
  return (
    <a
      href={SITE.downloadSetupExeUrl}
      className={cn(
        'va-win-btn inline-flex items-center justify-center gap-2.5 rounded-full font-semibold text-white no-underline transition-transform hover:scale-[1.02] active:scale-[0.98]',
        size === 'lg' ? 'px-7 py-3.5 text-[15px]' : 'px-5 py-2.5 text-sm',
        className,
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3 5.5L10.5 4.5V11H3V5.5zm0 13L10.5 19.5V13H3v5.5zM12 4.2L21 3v8.8H12V4.2zm0 15.6V12H21v9l-9-1.2z" />
      </svg>
      Get for Windows
    </a>
  )
}
