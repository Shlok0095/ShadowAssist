import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollReveal } from '@/components/marketing/ScrollReveal'
import { LightFooter } from '@/components/marketing/LightFooter'
import { SITE } from '@/config/site'
import {
  detectPlatform,
  fetchChannel,
  formatBytes,
  formatDate,
  KIND_LABELS,
  PLATFORM_LABELS,
  type DownloadArtifact,
  type DownloadPlatform,
  type ReleaseChannel,
} from '@/config/downloads'
import { FALLBACK_CHANNEL } from '@/config/downloads'

const ANDROID_APK_GITHUB =
  'https://github.com/Shlok0095/VeilAssist/releases/download/latest-stag/VeilAssist-Interview.apk'

const ghostBtnClass =
  'inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 no-underline transition-colors hover:border-cyan-500/20 hover:text-white'

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function WindowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5L10.5 4.5V11H3V5.5zm0 13L10.5 19.5V13H3v5.5zM12 4.2L21 3v8.8H12V4.2zm0 15.6V12H21v9l-9-1.2z" />
    </svg>
  )
}

function LinuxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C9.9 4.3 9.2 6.9 9.2 8.6c0 1.3.4 2.4.4 2.4H7.3c-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6h2c-.3 1-.9 2.4-1.7 2.9-.8.6-1.9.7-3 .6-.2 1.9 1.9 3 1.9 3 3.4 0 6.9-1.4 7.9-3.1.7-1.1.7-2.4.7-3.5h2.4c.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6h-2.4s.4-1.1.4-2.4c0-1.7-.7-4.3-2.9-6.6zM8.6 5.6c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm6.8 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.463 11.463 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2.566.566 0 0 0-.22.87l1.84 3.18C4.4 11.22 3 13.29 3 15.5V18h18v-2.5c0-2.21-1.4-4.28-3.4-5.02zM8.5 14c-.83 0-1.5-.67-1.5-1.5S7.67 11 8.5 11s1.5.67 1.5 1.5S9.33 14 8.5 14zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 11 15.5 11s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  )
}

function PlatformIcon({ platform }: { platform: DownloadPlatform }) {
  if (platform === 'windows') return <WindowsIcon />
  if (platform === 'macos') return <AppleIcon />
  if (platform === 'android') return <AndroidIcon />
  return <LinuxIcon />
}

function ArtifactCard({
  artifact,
  recommended,
}: {
  artifact: DownloadArtifact
  recommended: boolean
}) {
  const platformLabel = PLATFORM_LABELS[artifact.platform]
  const arch = artifact.arch ? artifact.arch.toUpperCase() : null
  const version = artifact.version ?? 'Rolling build'

  return (
    <div
      className={`relative rounded-2xl border p-5 text-left transition-colors ${
        recommended ? 'border-cyan-400/40 bg-cyan-400/[0.06]' : 'border-white/[0.07] bg-white/[0.03]'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2.5 right-4 rounded-full border border-cyan-400/40 bg-[#0a0f1a] px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-300">
          Recommended for your device
        </span>
      )}
      <div className="flex items-center gap-2.5 text-white">
        <span className="text-cyan-300/90">
          <PlatformIcon platform={artifact.platform} />
        </span>
        <span className="font-display text-base font-semibold tracking-[-0.01em]">
          {platformLabel}
          {arch ? ` · ${arch}` : ''}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-zinc-400">
          {KIND_LABELS[artifact.kind]}
        </span>
        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-zinc-400">
          {version}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
        <dt className="text-zinc-600">Size</dt>
        <dd className="text-right text-zinc-400">{formatBytes(artifact.size)}</dd>
        <dt className="text-zinc-600">Released</dt>
        <dd className="text-right text-zinc-400">{formatDate(artifact.releasedAt)}</dd>
        {artifact.checksum ? (
          <>
            <dt className="truncate text-zinc-600" title={artifact.checksum}>
              SHA-256
            </dt>
            <dd className="truncate text-right font-mono text-[10px] text-zinc-500" title={artifact.checksum}>
              {artifact.checksum.slice(0, 12)}…
            </dd>
          </>
        ) : null}
      </dl>
      <a
        href={artifact.downloadUrl}
        className="lm-btn lm-btn--primary mt-4 w-full justify-center"
        download={artifact.fileName}
      >
        Download
      </a>
    </div>
  )
}

function PlatformGroup({
  platform,
  artifacts,
  recommendedPlatform,
}: {
  platform: DownloadPlatform
  artifacts: DownloadArtifact[]
  recommendedPlatform: DownloadPlatform | null
}) {
  if (artifacts.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-white">
        <PlatformIcon platform={platform} />
        <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">
          {PLATFORM_LABELS[platform]}
        </h3>
        <span className="h-px flex-1 bg-white/[0.06]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {artifacts.map((a) => (
          <ArtifactCard
            key={a.fileName}
            artifact={a}
            recommended={recommendedPlatform === platform && artifacts.indexOf(a) === 0}
          />
        ))}
      </div>
    </div>
  )
}

function ChannelSection({ channel, note }: { channel: ReleaseChannel; note?: string }) {
  const grouped = useMemo(() => {
    const map: Record<DownloadPlatform, DownloadArtifact[]> = {
      windows: [],
      macos: [],
      linux: [],
      android: [],
    }
    for (const a of channel.artifacts) map[a.platform].push(a)
    return map
  }, [channel])
  const recommended = detectPlatform()

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
            {channel.tag === 'latest-stag' && channel.prerelease ? 'Latest builds' : 'Latest release'}
          </h2>
          <p className="mt-1 font-mono text-xs tracking-wide text-zinc-500">
            {channel.name} · published {formatDate(channel.publishedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {channel.checksumsUrl ? (
            <a href={channel.checksumsUrl} className={ghostBtnClass} target="_blank" rel="noreferrer">
              SHA-256 checksums
            </a>
          ) : null}
          <a href={channel.htmlUrl} className={ghostBtnClass} target="_blank" rel="noreferrer">
            View release
          </a>
        </div>
      </div>
      {note ? (
        <p className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-xs leading-relaxed text-zinc-500">
          {note}
        </p>
      ) : null}
      <div className="space-y-10">
        <PlatformGroup platform="android" artifacts={grouped.android} recommendedPlatform={recommended} />
        <PlatformGroup platform="windows" artifacts={grouped.windows} recommendedPlatform={recommended} />
        <PlatformGroup platform="macos" artifacts={grouped.macos} recommendedPlatform={recommended} />
        <PlatformGroup platform="linux" artifacts={grouped.linux} recommendedPlatform={recommended} />
      </div>
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.07]" />
            <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-4 h-9 animate-pulse rounded-xl bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DownloadsPage() {
  const [channels, setChannels] = useState<ReleaseChannel[]>([])
  const [loaded, setLoaded] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const candidates = Array.from(
        new Set([SITE.rollingTag, 'latest-stag', 'latest'].filter(Boolean)),
      )
      const settled = await Promise.allSettled(
        candidates.map((tag) => fetchChannel(SITE.repoOwner, SITE.repoName, tag)),
      )
      const found = settled
        .map((s) => (s.status === 'fulfilled' ? s.value : null))
        .filter((c): c is ReleaseChannel => c != null)

      if (cancelled) return
      if (found.length > 0) {
        setChannels(found)
        setUsedFallback(false)
      } else {
        setChannels([FALLBACK_CHANNEL])
        setUsedFallback(true)
      }
      setLoaded(true)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative min-w-0 font-sans text-white antialiased">
      <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-8 sm:pt-16 md:px-10 lg:px-14 xl:px-16">
        <div className="relative z-[1] mx-auto w-full max-w-5xl">
          <ScrollReveal>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-cyan-400/70">
              Desktop app
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Download VeilAssist
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed tracking-wide text-zinc-500">
              Free desktop app for Windows, macOS and Linux. Bring your own API
              key — your meetings stay on your device, and answers stream live
              into the overlay.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {!loaded ? (
        <LoadingSkeleton />
      ) : usedFallback ? (
        <ChannelSection
          channel={FALLBACK_CHANNEL}
          note="Release data is temporarily unavailable — showing the last known build snapshot."
        />
      ) : (
        channels.map((channel) => <ChannelSection key={channel.tag} channel={channel} />)
      )}

      <section className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-8">
        <ScrollReveal>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-cyan-400/70">
              Mobile interview
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Android interview app</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Download the APK and install it on your phone — not a browser tab. Paste your resume, start a
              session, and VeilAssist listens, transcribes, and generates answers when you finish speaking.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={SITE.downloadAndroidApkSiteUrl}
                className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-blue-500"
                download="VeilAssist-Interview.apk"
              >
                Download Android APK
              </a>
              <a href={ANDROID_APK_GITHUB} className={ghostBtnClass} target="_blank" rel="noreferrer">
                GitHub mirror
              </a>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Use the blue button for a normal Chrome download from veilassist.vercel.app (recommended on Android).
            </p>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
              <li>Tap <strong className="text-zinc-300">Download Android APK</strong> on your phone.</li>
              <li>Open the downloaded file and allow install from this source if Android asks.</li>
              <li>Open <strong className="text-zinc-300">VeilAssist Interview</strong> and grant microphone permission.</li>
            </ol>
            <p className="mt-4 text-xs text-zinc-500">
              Beta builds publish to the rolling <code className="text-zinc-400">latest-stag</code> release.
              The button downloads the APK file directly once CI has published it (first build may take ~15 minutes after push).
              Bring your own API key in the app — same as the desktop overlay.
            </p>
          </div>
        </ScrollReveal>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-mono text-xs tracking-wide text-zinc-600">
              Builds are produced automatically by the release pipeline and published to GitHub Releases.
            </p>
            <Link to="/docs/getting-started" className={ghostBtnClass}>
              Install & setup guide →
            </Link>
            <p className="text-xs text-zinc-600">
              Across platforms, the overlay, keyboard shortcuts and AI features behave identically.
            </p>
          </div>
        </ScrollReveal>
      </section>

      <LightFooter />
    </div>
  )
}