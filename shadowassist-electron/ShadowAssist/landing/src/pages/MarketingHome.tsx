import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const downloadRel = 'noopener noreferrer' as const

/** Electric blue — sole accent for primary actions */
const CTA =
  'inline-flex items-center justify-center rounded-[14px] bg-[#3b82f6] px-8 py-4 text-base font-semibold text-white no-underline shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_8px_32px_-4px_rgba(59,130,246,0.55)] transition-[transform,box-shadow,background-color] duration-300 hover:bg-[#2563eb] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_12px_48px_-2px_rgba(59,130,246,0.65)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]'

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
      { rootMargin: '-6% 0px -6% 0px', threshold: 0.06 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: on ? `${delayMs}ms` : '0ms' }}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        on ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" className="stroke-[#2a2a2a]" strokeWidth="1.5" />
      <path
        d="M10 16c2.5-4 9.5-4 12 0M10 20c2.5 3.5 9.5 3.5 12 0"
        className="stroke-[#737373]"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
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

function IconShield({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const features = [
  {
    icon: IconMic,
    title: 'Real-time Listening',
    desc: 'Captures voice context so you never miss the thread.',
  },
  {
    icon: IconScreen,
    title: 'Understands Your Screen',
    desc: "Reads what's on your display to ground every answer.",
  },
  {
    icon: IconBolt,
    title: 'Instant Answers',
    desc: 'Replies the moment you need them — no tab switching.',
  },
  {
    icon: IconShield,
    title: 'Private & Fast',
    desc: 'Runs on your machine with snappy, local-first performance.',
  },
] as const

function LiveMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#121212] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]">
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-[#525252]" />
        <span className="h-2 w-2 rounded-full bg-[#525252]" />
        <span className="h-2 w-2 rounded-full bg-[#525252]" />
        <span className="ml-2 text-xs font-medium uppercase tracking-wider text-[#737373]">Live session</span>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-[#2a2a2a] p-5 md:border-b-0 md:border-r">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#737373]">Conversation</p>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <span className="text-xs text-[#737373]">Participant</span>
              <p className="mt-1 text-[#b3b3b3]">Can we lock the launch date before Friday?</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3">
              <span className="text-xs text-[#737373]">Me</span>
              <p className="mt-1 text-white">Yes — if legal signs off by Wednesday.</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <span className="text-xs text-[#737373]">Participant</span>
              <p className="mt-1 text-[#b3b3b3]">What were the three risks from the deck?</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0a0a0a] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#737373]">AI response</p>
          <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-4">
            <p className="text-sm font-medium text-white">Summary</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-[#b3b3b3]">
              <li>Timeline: target Friday if legal approves by Wed.</li>
              <li>Risks called out: dependency on vendor API, QA bandwidth, compliance review.</li>
              <li>Next step: confirm sign-off owner and send a one-pager.</li>
            </ul>
          </div>
          <p className="mt-3 text-xs text-[#737373]">Updated as the call progresses</p>
        </div>
      </div>
    </div>
  )
}

export function MarketingHome() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] text-white antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 md:pt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[28%] h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 rounded-full bg-[#3b82f6] opacity-[0.07] blur-[100px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
        </div>

        <div className="relative z-[1] mx-auto max-w-3xl text-center">
          <FadeIn>
            <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Your AI That Sees, Listens, and Answers Instantly
            </h1>
          </FadeIn>
          <FadeIn delayMs={80} className="mt-5 sm:mt-6">
            <p className="mx-auto max-w-xl text-base leading-relaxed text-[#b3b3b3] sm:text-lg">
              Real-time meeting assistant powered by screen + voice understanding.
            </p>
          </FadeIn>

          <FadeIn delayMs={140} className="relative mt-10 flex flex-col items-center gap-4 sm:mt-12">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-[min(100%,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] opacity-25 blur-[48px]" aria-hidden />
            <a href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadRel} className={`relative z-[1] w-full max-w-xs sm:w-auto ${CTA}`}>
              Download for Windows
            </a>
            <p className="text-sm text-[#737373]">Coming soon for macOS</p>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Built for live work</h2>
              <p className="mt-3 text-[#b3b3b3]">Everything you need to stay ahead of the conversation.</p>
            </div>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delayMs={i * 60}>
                <article className="group flex h-full flex-col rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#3a3a3a] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-[#b3b3b3] transition-colors duration-300 group-hover:text-white">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">{f.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Live experience */}
      <section id="live" className="scroll-mt-24 border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Live experience</h2>
              <p className="mt-3 text-[#b3b3b3]">See conversations as they happen. Get answers instantly.</p>
            </div>
          </FadeIn>
          <FadeIn delayMs={100} className="mt-12">
            <LiveMock />
          </FadeIn>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <FadeIn>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Get Started in Seconds</h2>
            <p className="mt-3 text-[#b3b3b3] sm:text-lg">No setup. No complexity. Just install and go.</p>
          </FadeIn>
          <FadeIn delayMs={100} className="relative mt-10">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] opacity-20 blur-[56px]" aria-hidden />
            <a href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadRel} className={`relative z-[1] w-full ${CTA} py-[1.125rem] text-lg`}>
              Download for Windows
            </a>
          </FadeIn>
        </div>
      </section>

      {/* System requirements */}
      <section id="requirements" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-center text-xl font-bold text-white sm:text-2xl">System requirements</h2>
          </FadeIn>
          <FadeIn delayMs={80} className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#737373]">Windows</p>
              <ul className="mt-4 space-y-2 text-sm text-[#b3b3b3]">
                <li>Windows 11</li>
                <li>64-bit processor</li>
                <li>8GB RAM recommended</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#737373]">macOS</p>
              <p className="mt-4 text-sm text-[#b3b3b3]">Coming soon</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9 shrink-0" />
            <span className="text-sm font-semibold text-white">{SITE.name}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/legal/privacy" className="text-sm text-[#b3b3b3] no-underline transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-sm text-[#b3b3b3] no-underline transition-colors hover:text-white">
              Terms
            </Link>
          </div>
          <p className="text-center text-xs text-[#737373] sm:text-right">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
