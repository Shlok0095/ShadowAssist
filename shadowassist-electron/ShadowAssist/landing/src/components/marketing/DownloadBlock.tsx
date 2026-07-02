import { GlowCta } from '@/components/marketing/GlowCta'
import { APP_VERSION, SITE } from '@/config/site'
import { useRollingReleaseMeta } from '@/hooks/useRollingReleaseMeta'
import { cn } from '@/components/ui/cn'

type DownloadBlockProps = {
  layout?: 'hero' | 'section'
  className?: string
}

export function DownloadBlock({ layout = 'section', className }: DownloadBlockProps) {
  const releaseMeta = useRollingReleaseMeta()
  const compact = layout === 'hero'

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'grid gap-4',
          compact ? 'mx-auto max-w-lg grid-cols-1 sm:grid-cols-2' : 'mx-auto max-w-2xl grid-cols-1 sm:grid-cols-2',
        )}
      >
        <article className="va-download-card flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
          <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest text-blue-300/90">
            Recommended
          </span>
          <h3 className="font-display text-lg font-semibold text-white">Windows installer</h3>
          <p className="text-sm leading-relaxed text-zinc-500">
            One-click setup · desktop shortcut · auto-update channel
          </p>
          <GlowCta href={SITE.downloadSetupExeUrl} size={compact ? 'md' : 'lg'} className="mt-1 w-full">
            Download VeilAssist Setup
          </GlowCta>
          <p className="font-mono text-[11px] text-zinc-600">VeilAssist-Setup.exe · v{APP_VERSION}</p>
        </article>

        <article className="va-download-card flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Portable
          </span>
          <h3 className="font-display text-lg font-semibold text-white">Portable exe</h3>
          <p className="text-sm leading-relaxed text-zinc-500">
            Single file · no install · run from USB or Downloads
          </p>
          <GlowCta href={SITE.downloadPortablePageUrl} size={compact ? 'md' : 'lg'} className="mt-1 w-full">
            Download VeilAssist.exe
          </GlowCta>
          <p className="font-mono text-[11px] text-zinc-600">
            <a
              href={SITE.checksumsTxtUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline decoration-white/10 underline-offset-2 hover:text-blue-300/90"
            >
              SHA256 checksums
            </a>
          </p>
        </article>
      </div>

      {releaseMeta.kind === 'ok' ? (
        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-zinc-600">
          Rolling build{' '}
          <span className="text-blue-400/80">{releaseMeta.tag.replace(/^v/i, '')}</span>
          {releaseMeta.updatedLabel ? ` · updated ${releaseMeta.updatedLabel}` : null}
        </p>
      ) : null}

      <p className="mt-3 text-center text-xs leading-relaxed text-zinc-600">
        Downloads are served via{' '}
        <a
          href={SITE.releasesRollingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline decoration-white/10 underline-offset-2 hover:text-blue-300/90"
        >
          GitHub Releases
        </a>
        . No account required · keys stay on your machine.
      </p>
    </div>
  )
}
