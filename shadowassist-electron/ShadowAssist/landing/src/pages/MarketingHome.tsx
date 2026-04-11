import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HeroLiveMock } from '@/components/home/HeroLiveMock'
import { SITE } from '@/config/site'

const downloadRel = 'noopener noreferrer' as const

/** High-contrast CTA: blue, white text, glow + scale on hover */
const CTA =
  'inline-flex items-center justify-center rounded-[14px] bg-[#3b82f6] px-8 py-4 text-base font-semibold text-white no-underline shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_8px_36px_-4px_rgba(59,130,246,0.55)] transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.03] hover:bg-[#2563eb] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.45),0_12px_48px_-2px_rgba(59,130,246,0.65)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]'

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
    icon: IconEye,
    title: 'Works Invisibly',
    desc: 'Hotkey-first chrome, minimal footprint—visible only when you summon it.',
    span: 'lg:col-span-1',
  },
] as const

export function MarketingHome() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] text-white antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 md:pt-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[20%] h-[min(88vw,480px)] w-[min(88vw,480px)] -translate-x-1/2 rounded-full bg-[#3b82f6]/[0.07] blur-[100px] motion-safe:animate-[pulse_7s_ease-in-out_infinite]" />
          <div className="absolute bottom-[10%] right-[-10%] h-64 w-64 rounded-full bg-[#8b5cf6]/[0.06] blur-[90px]" />
        </div>

        <div className="relative z-[1] mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="min-w-0 text-center lg:text-left">
            <FadeIn>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#60a5fa]">Native intelligence layer</p>
              <h1 className="text-[1.65rem] font-bold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[2.75rem]">
                Context-aware AI that keeps pace with the room.
              </h1>
            </FadeIn>
            <FadeIn delayMs={70} className="mt-4 sm:mt-5">
              <p className="mx-auto max-w-xl text-base leading-relaxed text-[#a1a1aa] lg:mx-0 lg:max-w-[26rem]">
                Fuse optional audio and viewport signals into one overlay—BYOK, provider-direct TLS, no baked-in keys. The
                preview cycles voice → model output → structured screen extract → grounded synthesis.
              </p>
            </FadeIn>
            <FadeIn delayMs={130} className="relative mt-8 flex flex-col items-center gap-3 sm:mt-10 lg:items-start">
              <div className="pointer-events-none absolute -left-4 top-1/2 h-32 w-56 -translate-y-1/2 rounded-full bg-[#3b82f6]/18 blur-[44px] lg:left-0" aria-hidden />
              <a href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadRel} className={`relative z-[1] ${CTA} w-full max-w-xs sm:w-auto`}>
                Download for Windows
              </a>
              <p className="text-sm text-[#71717a]">macOS · roadmap</p>
              <p className="text-xs text-[#52525b]">
                <Link to="/how-it-works" className="text-[#a1a1aa] underline-offset-4 hover:text-white hover:underline">
                  How it works
                </Link>
                <span className="mx-2 text-[#3f3f46]">·</span>
                <Link
                  to="/built-for-live-work"
                  className="text-[#a1a1aa] underline-offset-4 hover:text-white hover:underline"
                >
                  Built for live work
                </Link>
              </p>
            </FadeIn>
          </div>

          <FadeIn delayMs={90} className="relative min-w-0 lg:justify-self-end">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[1.5rem] bg-gradient-to-br from-[#3b82f6]/20 via-transparent to-[#8b5cf6]/15 opacity-80 blur-2xl motion-safe:animate-pulse sm:-inset-6"
              aria-hidden
            />
            <HeroLiveMock className="relative ring-1 ring-[#3b82f6]/15" />
          </FadeIn>
        </div>
      </section>

      {/* Bento */}
      <section id="features" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-center text-xl font-bold tracking-tight text-white sm:text-2xl">Inference-adjacent, unified</h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[#a1a1aa]">
              Four primitives—listening, latency-bounded answers, viewport grounding, discreet UI—composed in one surface.
            </p>
          </FadeIn>
          <div className="mt-10 grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {bento.map((card, i) => (
              <FadeIn key={card.title} delayMs={i * 55} className={card.span}>
                <article
                  className={`group flex h-full flex-col rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#3b82f6]/30 hover:shadow-[0_20px_56px_-24px_rgba(59,130,246,0.22)]`}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-[#60a5fa] transition-colors group-hover:border-[#3b82f6]/35 group-hover:text-[#93c5fd]">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">{card.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-lg text-center">
          <FadeIn>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Download for Windows</h2>
            <p className="mt-2 text-[#a1a1aa]">
              NSIS installer · no account gate · credentials stay local after first launch.
            </p>
          </FadeIn>
          <FadeIn delayMs={90} className="relative mt-10">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6]/20 blur-[56px]"
              aria-hidden
            />
            <a
              href={SITE.downloadSetupExeUrl}
              target="_blank"
              rel={downloadRel}
              className={`relative z-[1] w-full ${CTA} py-[1.125rem] text-lg`}
            >
              Download for Windows
            </a>
            <p className="mt-4 text-sm text-[#71717a]">macOS client · on the roadmap</p>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-[#2a2a2a] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-semibold text-[#a1a1aa]">{SITE.name}</span>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link to="/legal/privacy" className="text-[#a1a1aa] no-underline hover:text-white">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-[#a1a1aa] no-underline hover:text-white">
              Terms
            </Link>
            <Link to="/docs" className="text-[#a1a1aa] no-underline hover:text-white">
              Docs
            </Link>
          </div>
          <p className="text-xs text-[#52525b]">© {new Date().getFullYear()} {SITE.name}</p>
        </div>
      </footer>
    </div>
  )
}
