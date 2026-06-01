import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { HeroLiveMock } from '@/components/home/HeroLiveMock'
import { FeatureMarquee } from '@/components/marketing/FeatureMarquee'
import { GlowCta } from '@/components/marketing/GlowCta'
import { ScrollReveal } from '@/components/marketing/ScrollReveal'
import { SITE } from '@/config/site'
import { useRollingReleaseMeta } from '@/hooks/useRollingReleaseMeta'

function IconMic({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
      <path d="M8 11v1a4 4 0 004 4M16 12v-1M12 19v2M8 21h8" strokeLinecap="round" />
    </svg>
  )
}

function IconScreen({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" strokeLinecap="round" />
    </svg>
  )
}

function IconBolt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" strokeLinejoin="round" />
    </svg>
  )
}

function IconEye({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M8 14h2M12 14h2M16 14h2M8 17h2M12 17h2" strokeLinecap="round" />
    </svg>
  )
}

const bento = [
  {
    icon: IconMic,
    title: 'Real-time Listening',
    desc: 'Explicit toggles; capture the last utterance, not a vague “always on” mic graph.',
  },
  {
    icon: IconBolt,
    title: 'Instant Answers',
    desc: 'Token stream in the overlay; no context switch when the meeting is moving.',
  },
  {
    icon: IconScreen,
    title: 'Understands Your Screen',
    desc: 'Optional viewport text informs the model—grounding without pasting shots.',
  },
  {
    icon: IconCalendar,
    title: 'Meetings & recaps',
    desc: 'Optional Google Calendar; bullet summaries after Listen/Stop, saved locally across restarts.',
  },
  {
    icon: IconEye,
    title: 'Works Invisibly',
    desc: 'Hotkey-first, compact chrome—only visible when you summon it.',
  },
] as const

const shipped = [
  {
    title: 'Meetings tab',
    body:
      'Connect Google Calendar with your own OAuth app credentials. See upcoming accepted meetings and optionally get Windows notifications before start time.',
  },
  {
    title: 'Meeting summaries',
    body:
      'Each Listen session (Start → Stop) can produce a concise bullet summary. Pick a session by time range and read the recap from that session.',
  },
  {
    title: 'Recaps that survive restarts',
    body:
      'Session summaries are stored in your local app data so they stay after you quit or reboot. Clear past summaries from Settings when you want.',
  },
  {
    title: 'System prompt',
    body:
      'A built-in default system prompt ships with the app; override it in Profile when you need a custom voice.',
  },
] as const

export function MarketingHome() {
  const releaseMeta = useRollingReleaseMeta()
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative min-w-0 font-sans text-white antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-16 md:px-10 lg:px-14 xl:px-16">
        <div className="relative z-[1] mx-auto grid w-full max-w-[90rem] gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-x-16 xl:gap-x-20">
          <div className="min-w-0 text-center lg:text-left">
            <ScrollReveal>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.55)] motion-safe:animate-pulse" />
                Windows desktop app
              </div>
              <h1 className="font-display text-[1.85rem] font-bold leading-[1.06] tracking-[-0.03em] sm:text-4xl md:text-5xl lg:text-[3.15rem] xl:text-[3.45rem]">
                <span className="block text-white">AI overlay</span>
                <span className="futura-gradient-text mt-1 block">for live meetings</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.08} className="mt-6">
              <p className="mx-auto max-w-2xl font-mono text-[0.8125rem] leading-[1.8] tracking-wide text-zinc-400 sm:text-sm lg:mx-0 lg:max-w-[38rem]">
                Fuse optional audio and viewport signals into one overlay—BYOK, provider-direct TLS, no baked-in keys.
                Answers stream in a slim panel while the meeting keeps moving.
              </p>
              <div className="futura-glass-chip mx-auto mt-5 max-w-2xl px-4 py-3 text-left font-mono text-[0.7rem] leading-relaxed tracking-wide text-zinc-500 sm:text-xs lg:mx-0">
                <span className="text-cyan-300/90">Floating overlay</span>
                <span className="text-zinc-600"> · </span>
                Tray-resident, hotkey-friendly—no second monitor or browser tab hand-off.
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.14} className="mt-9 flex flex-col items-center gap-4 lg:items-start">
              <GlowCta href={SITE.downloadSetupExeUrl} size="lg" className="w-full max-w-sm sm:w-auto">
                Download for Windows
                <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </GlowCta>
              <p className="font-mono text-xs tracking-wide text-zinc-600">macOS · roadmap</p>
              <p className="font-mono text-[11px] tracking-wide text-zinc-600">
                <Link to="/how-it-works" className="text-zinc-500 transition-colors hover:text-cyan-300/90">
                  How it works
                </Link>
                <span className="mx-2 text-zinc-700">·</span>
                <Link to="/built-for-live-work" className="text-zinc-500 transition-colors hover:text-cyan-300/90">
                  Built for live work
                </Link>
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.1} className="relative min-w-0 w-full lg:justify-self-end">
            <div className="futura-mock-frame relative">
              <div className="futura-mock-frame__halo" aria-hidden />
              {!reduceMotion ? (
                <motion.div
                  className="absolute -inset-px rounded-[1.35rem] opacity-60"
                  style={{
                    background:
                      'conic-gradient(from 180deg, rgba(34,211,238,0.35), rgba(139,92,246,0.25), rgba(59,130,246,0.3), rgba(34,211,238,0.35))',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  aria-hidden
                />
              ) : null}
              <HeroLiveMock className="relative z-[1] ring-1 ring-white/10" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <FeatureMarquee />

      {/* Shipped */}
      <section
        id="app-features"
        className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-8 md:px-10 lg:px-14 xl:px-16"
      >
        <div className="mx-auto w-full max-w-[90rem]">
          <ScrollReveal>
            <p className="text-center font-mono text-xs font-medium uppercase tracking-[0.24em] text-cyan-400/70">
              In the product
            </p>
            <h2 className="mt-3 text-center font-display text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl md:text-[2.15rem]">
              What the Windows app includes
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center font-mono text-sm leading-relaxed tracking-wide text-zinc-500">
              Calendar hooks, session recaps, and persona controls sit alongside the overlay and tray—same matte chrome
              throughout.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {shipped.map((row, i) => (
              <ScrollReveal key={row.title} delay={i * 0.06}>
                <article className="futura-card group flex h-full flex-col p-6 sm:p-7">
                  <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-white">{row.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed tracking-wide text-zinc-500 transition-colors group-hover:text-zinc-400">
                    {row.body}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.2} className="mt-10 text-center">
            <Link
              to="/docs/getting-started"
              className="font-mono text-sm text-zinc-500 underline decoration-cyan-500/30 underline-offset-4 transition-colors hover:text-cyan-300/90"
            >
              Step-by-step: Getting started →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Bento */}
      <section id="features" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto w-full max-w-[90rem]">
          <ScrollReveal>
            <h2 className="text-center font-display text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl md:text-[1.85rem]">
              Features
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center font-mono text-sm leading-relaxed tracking-wide text-zinc-500">
              Listening, low-latency answers, screen grounding, and a compact overlay surface—one panel.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-2xl lg:max-w-4xl">
            {bento.map((card, i) => (
              <ScrollReveal
                key={card.title}
                delay={i * 0.05}
                className={i === 4 ? 'col-span-2 flex justify-center' : 'min-w-0'}
              >
                <article
                  className={
                    i === 4
                      ? 'futura-card group flex h-full min-h-[10.25rem] w-full max-w-[calc(50%-0.375rem)] flex-col p-4 sm:min-h-[9.75rem] sm:max-w-[calc((100%-0.75rem)/2)] sm:p-5'
                      : 'futura-card group flex h-full min-h-[10.25rem] w-full min-w-0 flex-col p-4 sm:min-h-[9.75rem] sm:p-5'
                  }
                >
                  <div className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] text-cyan-300/80 transition-colors group-hover:border-cyan-400/30 group-hover:text-cyan-200">
                    <card.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-base font-semibold leading-snug tracking-[-0.01em] text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed tracking-wide text-zinc-500 line-clamp-4 sm:text-[0.8125rem]">
                    {card.desc}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto w-full max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl md:text-[2.1rem]">
              Ready when the room is
            </h2>
            <p className="mt-3 font-mono text-sm tracking-wide text-zinc-500">
              NSIS installer · no account gate · credentials stay local after first launch.
            </p>
            {releaseMeta.kind === 'ok' ? (
              <p className="mt-2 font-mono text-[11px] tracking-wide text-zinc-600">
                Latest build{' '}
                <span className="text-cyan-400/80">{releaseMeta.tag.replace(/^v/i, '')}</span>
                {releaseMeta.updatedLabel ? ` · ${releaseMeta.updatedLabel}` : null}
              </p>
            ) : null}
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="relative mx-auto mt-10 max-w-md">
            <div className="futura-download-glow pointer-events-none absolute inset-0" aria-hidden />
            <GlowCta href={SITE.downloadSetupExeUrl} size="lg" className="relative z-[1] w-full">
              Download for Windows
            </GlowCta>
            <p className="mt-4 font-mono text-xs tracking-wide text-zinc-600">macOS client · on the roadmap</p>
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-sm font-semibold tracking-tight text-zinc-400">{SITE.name}</span>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs tracking-wide">
            <Link to="/legal/privacy" className="text-zinc-500 no-underline transition-colors hover:text-cyan-300/90">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-zinc-500 no-underline transition-colors hover:text-cyan-300/90">
              Terms
            </Link>
            <Link to="/docs" className="text-zinc-500 no-underline transition-colors hover:text-cyan-300/90">
              Docs
            </Link>
          </div>
          <p className="font-mono text-[11px] tracking-wide text-zinc-600">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </footer>
    </div>
  )
}
