import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HeroLiveMock } from '@/components/home/HeroLiveMock'
import { SITE } from '@/config/site'

const downloadRel = 'noopener noreferrer' as const

/** Charcoal CTA — no underline (see `marketing-cta` in index.css) */
const CTA =
  'marketing-cta inline-flex items-center justify-center rounded-2xl border border-[#3f3f46] bg-[#1f1f1f] px-8 py-4 font-display text-base font-semibold tracking-wide text-zinc-50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_40px_-12px_rgba(0,0,0,0.65)] transition-[transform,box-shadow,background-color,border-color] duration-300 hover:scale-[1.03] hover:border-[#52525b] hover:bg-[#2a2a2a] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_20px_56px_-16px_rgba(0,0,0,0.75)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500'

function FadeIn({
  children,
  className = '',
  delayMs = 0,
}: {
  children: ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setOn(true)
      },
      { rootMargin: '-5% 0px -5% 0px', threshold: 0.08 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: on ? `${delayMs}ms` : '0ms' }}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        on ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

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
    desc: 'Optional audio path with explicit toggles—capture the last utterance, not a vague “always on” mic graph.',
    span: 'lg:col-span-2',
  },
  {
    icon: IconBolt,
    title: 'Instant Answers',
    desc: 'Token stream lands in the overlay; zero context switches when the meeting is moving.',
    span: 'lg:col-span-1',
  },
  {
    icon: IconScreen,
    title: 'Understands Your Screen',
    desc: 'When you allow it, structured text from the viewport informs the model—grounding without pasting screenshots.',
    span: 'lg:col-span-2',
  },
  {
    icon: IconCalendar,
    title: 'Meetings & recaps',
    desc: 'Optional Google Calendar connection for accepted meetings and reminders. After each Listen session, generate a plain bullet summary—saved on your machine so it survives restarts.',
    span: 'lg:col-span-1',
  },
  {
    icon: IconEye,
    title: 'Works Invisibly',
    desc: 'Hotkey-first chrome, minimal footprint—visible only when you summon it.',
    span: 'lg:col-span-1',
  },
] as const

export function MarketingHome() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] font-sans text-white antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 md:px-10 md:pt-16 lg:px-14 xl:px-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[18%] h-[min(92vw,520px)] w-[min(92vw,520px)] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[100px] motion-safe:animate-[pulse_7s_ease-in-out_infinite]" />
          <div className="absolute bottom-[8%] right-[-5%] h-[min(50vw,420px)] w-[min(50vw,420px)] rounded-full bg-zinc-600/10 blur-[100px]" />
        </div>

        <div className="relative z-[1] mx-auto grid w-full max-w-[90rem] gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16 lg:gap-y-12 lg:content-start xl:gap-x-24">
          <div className="min-w-0 text-center lg:max-w-none lg:text-left lg:pt-1 lg:sticky lg:top-28 lg:z-[1] lg:self-start">
            <FadeIn>
              <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500 sm:text-xs sm:tracking-[0.22em]">
                Native intelligence layer
              </p>
              <h1 className="font-display text-[1.7rem] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl md:text-5xl lg:text-[2.85rem] xl:text-[3.1rem]">
                Context-aware AI that keeps pace with the room.
              </h1>
            </FadeIn>
            <FadeIn delayMs={70} className="mt-5 sm:mt-6">
              <p className="mx-auto max-w-2xl font-mono text-[0.8125rem] leading-[1.75] tracking-wide text-zinc-400 sm:text-sm lg:mx-0 lg:max-w-[36rem] xl:max-w-[40rem]">
                Fuse optional audio and viewport signals into one overlay—BYOK, provider-direct TLS, no baked-in keys. The
                preview cycles voice → model output → structured screen extract → grounded synthesis.
              </p>
            </FadeIn>
            <FadeIn delayMs={130} className="relative mt-8 flex flex-col items-center gap-3 sm:mt-10 lg:items-start">
              <div className="pointer-events-none absolute -left-4 top-1/2 h-36 w-64 -translate-y-1/2 rounded-full bg-zinc-500/10 blur-[48px] lg:left-0" aria-hidden />
              <a href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadRel} className={`relative z-[1] ${CTA} w-full max-w-sm sm:w-auto`}>
                Download for Windows
              </a>
              <p className="font-mono text-xs tracking-wide text-zinc-600">macOS · roadmap</p>
              <p className="font-mono text-[11px] tracking-wide text-zinc-600">
                <Link
                  to="/how-it-works"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  How it works
                </Link>
                <span className="mx-2 text-zinc-700">·</span>
                <Link to="/built-for-live-work" className="text-zinc-500 transition-colors hover:text-zinc-300">
                  Built for live work
                </Link>
              </p>
            </FadeIn>
          </div>

          <FadeIn
            delayMs={90}
            className="relative min-w-0 w-full shrink-0 lg:h-[29rem] lg:justify-self-end lg:min-h-[29rem] xl:max-w-[36rem] xl:justify-self-end"
          >
            <div
              className="pointer-events-none absolute -inset-4 rounded-[1.5rem] bg-gradient-to-br from-white/[0.06] via-transparent to-zinc-600/10 opacity-90 blur-2xl motion-safe:animate-pulse sm:-inset-6"
              aria-hidden
            />
            <HeroLiveMock className="relative ring-1 ring-zinc-700/50" />
          </FadeIn>
        </div>
      </section>

      {/* Bento */}
      <section id="features" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-14 sm:px-8 sm:py-16 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto w-full max-w-[90rem]">
          <FadeIn>
            <h2 className="text-center font-display text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl md:text-[1.75rem]">
              Inference-adjacent, unified
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center font-mono text-sm leading-relaxed tracking-wide text-zinc-500">
              Listening, low-latency answers, screen grounding, session recaps, and a discreet surface—one panel.
            </p>
          </FadeIn>
          <div className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:gap-6">
            {bento.map((card, i) => (
              <FadeIn key={card.title} delayMs={i * 55} className={card.span}>
                <article
                  className={`group flex h-full flex-col rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-zinc-600/60 hover:shadow-[0_24px_64px_-20px_rgba(0,0,0,0.55)] sm:p-7`}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-zinc-400 transition-colors group-hover:border-zinc-600 group-hover:text-zinc-200">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed tracking-wide text-zinc-500">{card.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-8 sm:py-20 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto w-full max-w-3xl text-center">
          <FadeIn>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl md:text-[2rem]">
              Download for Windows
            </h2>
            <p className="mt-3 font-mono text-sm tracking-wide text-zinc-500">
              NSIS installer · no account gate · credentials stay local after first launch.
            </p>
          </FadeIn>
          <FadeIn delayMs={90} className="relative mx-auto mt-10 max-w-md">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-600/15 blur-[56px]"
              aria-hidden
            />
            <a
              href={SITE.downloadSetupExeUrl}
              target="_blank"
              rel={downloadRel}
              className={`relative z-[1] block w-full ${CTA} py-[1.125rem] text-lg`}
            >
              Download for Windows
            </a>
            <p className="mt-4 font-mono text-xs tracking-wide text-zinc-600">macOS client · on the roadmap</p>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-[#2a2a2a] px-4 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-sm font-semibold tracking-tight text-zinc-400">{SITE.name}</span>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs tracking-wide">
            <Link to="/legal/privacy" className="text-zinc-500 no-underline transition-colors hover:text-zinc-200">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-zinc-500 no-underline transition-colors hover:text-zinc-200">
              Terms
            </Link>
            <Link to="/docs" className="text-zinc-500 no-underline transition-colors hover:text-zinc-200">
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
