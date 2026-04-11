import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const downloadRel = 'noopener noreferrer' as const

/** Light orange — sole accent for primary actions & highlights */
const CTA =
  'inline-flex items-center justify-center rounded-[14px] bg-[#fb923c] px-8 py-4 text-base font-semibold text-[#0a0a0a] no-underline shadow-[0_0_0_1px_rgba(251,146,60,0.35),0_8px_32px_-4px_rgba(251,146,60,0.5)] transition-[transform,box-shadow,background-color] duration-300 hover:bg-[#f97316] hover:shadow-[0_0_0_1px_rgba(251,146,60,0.45),0_12px_48px_-2px_rgba(249,115,22,0.55)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fb923c]'

const accentBorder = 'border-[#fb923c]/35'
const accentText = 'text-[#fdba74]'
const accentMuted = 'text-[#fb923c]/90'
const glowBlob = 'bg-[#fb923c]'

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

function useTypewriter(text: string, msPerChar: number, startWhenVisible: boolean) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!startWhenVisible) return
    setShown('')
    setDone(false)
    let i = 0
    const t = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(t)
        setDone(true)
      }
    }, msPerChar)
    return () => window.clearInterval(t)
  }, [text, msPerChar, startWhenVisible])

  return { shown, done }
}

function TypewriterBlock({ text, active }: { text: string; active: boolean }) {
  const { shown, done } = useTypewriter(text, 18, active)
  return (
    <p className="text-sm leading-relaxed text-[#d4d4d4]">
      {shown}
      {!done ? <span className={`ml-0.5 inline-block h-4 w-0.5 animate-pulse align-[-2px] bg-[#fb923c]`} aria-hidden /> : null}
    </p>
  )
}

function OverlayPreview() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setActive(true)
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const answerText =
    "I'm not sure what information you're looking for. My guess is that you might want help locating or opening a specific file (e.g., a PDF or document) shown on the screen. If you're trying to locate or open the 'Invoice' PDF visible on the screen, say \"open the invoice\" or ask for a short summary of what's in it."

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-2xl border ${accentBorder} bg-[#0a0a0a]/95 shadow-[0_0_0_1px_rgba(251,146,60,0.08),0_24px_80px_-20px_rgba(0,0,0,0.85),0_0_80px_-30px_rgba(251,146,60,0.15)] backdrop-blur-xl`}
    >
      {/* Futuristic grid + corner accents */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(251,146,60,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#fb923c]/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#f97316]/10 blur-3xl" aria-hidden />

      {/* Top bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a2a] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fb923c]/20 ring-1 ring-[#fb923c]/40">
            <span className="text-xs font-bold text-[#fb923c]">S</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-[#fb923c]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 10v4M8 8v8M12 4v16M16 8v8M20 10v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="truncate text-xs text-[#b3b3b3] sm:text-sm">
              <span className={accentMuted}>Me:</span> Live transcript
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#2a2a2a] bg-[#121212] px-2.5 py-1.5 text-xs font-medium text-[#b3b3b3]"
            tabIndex={-1}
          >
            Stop
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#737373]" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
            </svg>
          </span>
          <button
            type="button"
            className="rounded-lg border border-[#2a2a2a] bg-[#121212] px-2.5 py-1.5 text-xs font-medium text-[#b3b3b3]"
            tabIndex={-1}
          >
            Quit
          </button>
        </div>
      </div>

      <div className="relative space-y-4 p-4 sm:p-5">
        <div>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${accentText} ring-1 ring-[#fb923c]/30 bg-[#fb923c]/10`}
          >
            Latest reply
          </span>
          <h3 className="mt-2 text-base font-semibold text-white">Answer</h3>
          <div className="mt-3 rounded-xl border border-[#2a2a2a] bg-[#121212]/90 p-4">
            <TypewriterBlock text={answerText} active={active} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] py-2 pl-4 pr-2">
          <span className="flex-1 truncate text-sm text-[#737373]">Ask anything… or press Enter to read screen.</span>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fb923c] text-[#0a0a0a] shadow-[0_0_20px_-4px_rgba(251,146,60,0.7)]"
            aria-hidden
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </span>
        </div>
      </div>
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

function IconKey({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        d="M15.5 8.5a3.5 3.5 0 10-4.95 4.95L7 18h3v-2h2v-2h2l1.05-1.05a3.5 3.5 0 004.45-5.45z"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="9" r="1.2" fill="currentColor" />
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

const howSteps = [
  {
    step: '01',
    title: 'Install',
    desc: 'Download the Windows app and complete the quick installer — no account wall.',
  },
  {
    step: '02',
    title: 'Connect your AI',
    desc: 'Paste your API key in Settings and pick a chat model. Your keys stay on your device.',
  },
  {
    step: '03',
    title: 'Use the overlay',
    desc: 'During calls or focus work, summon the overlay, listen or read the screen, and get answers inline.',
  },
] as const

const providers = [
  { name: 'Groq', tag: 'FAST', featured: true },
  { name: 'OpenAI', tag: 'GPT' },
  { name: 'Anthropic', tag: 'CLAUDE' },
  { name: 'DeepSeek', tag: 'V3' },
  { name: 'Kimi', tag: 'KIMI' },
  { name: 'Mistral', tag: 'EU' },
  { name: 'xAI', tag: 'GROK' },
  { name: 'OpenRouter', tag: 'HUB' },
  { name: 'Together AI', tag: 'OSS' },
  { name: 'Perplexity', tag: 'SONAR' },
  { name: 'Google Gemini', tag: 'GEMINI' },
  { name: 'Fireworks', tag: 'FW' },
  { name: 'Cerebras', tag: 'CB' },
  { name: 'NVIDIA NIM', tag: 'NIM' },
  { name: 'Custom', tag: 'API' },
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
            <div className={`rounded-xl border ${accentBorder} bg-[#1a1a1a] p-3`}>
              <span className={`text-xs ${accentMuted}`}>Me</span>
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
          <div className={`rounded-xl border ${accentBorder} bg-[#121212] p-4`}>
            <p className="text-sm font-medium text-white">Summary</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-[#b3b3b3]">
              <li>Timeline: target Friday if legal approves by Wed.</li>
              <li>Risks: vendor API dependency, QA bandwidth, compliance review.</li>
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
          <div
            className={`absolute left-1/2 top-[28%] h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 rounded-full ${glowBlob} opacity-[0.09] blur-[100px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]`}
          />
        </div>

        <div className="relative z-[1] mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className={`mb-4 text-xs font-semibold uppercase tracking-[0.2em] ${accentText}`}>Desktop AI layer</p>
            <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Your AI That Sees, Listens, and Answers Instantly
            </h1>
          </FadeIn>
          <FadeIn delayMs={80} className="mt-5 sm:mt-6">
            <p className="mx-auto max-w-xl text-base leading-relaxed text-[#b3b3b3] sm:text-lg">
              Real-time meeting assistant powered by screen + voice understanding. Bring your own keys — pick the models you
              trust.
            </p>
          </FadeIn>

          <FadeIn delayMs={140} className="relative mt-10 flex flex-col items-center gap-4 sm:mt-12">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-[min(100%,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fb923c] opacity-20 blur-[48px]"
              aria-hidden
            />
            <a href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadRel} className={`relative z-[1] w-full max-w-xs sm:w-auto ${CTA}`}>
              Download for Windows
            </a>
            <p className="text-sm text-[#737373]">Coming soon for macOS</p>
          </FadeIn>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">How it works</h2>
              <p className="mt-3 text-[#b3b3b3]">From install to in-call answers in three steps.</p>
            </div>
          </FadeIn>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {howSteps.map((s, i) => (
              <FadeIn key={s.step} delayMs={i * 70}>
                <div
                  className={`relative h-full rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 transition-[box-shadow,border-color] duration-300 hover:border-[#fb923c]/25 hover:shadow-[0_0_40px_-20px_rgba(251,146,60,0.2)]`}
                >
                  <span className={`text-3xl font-bold tabular-nums ${accentText} opacity-90`}>{s.step}</span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
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
                <article
                  className={`group flex h-full flex-col rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#fb923c]/30 hover:shadow-[0_20px_50px_-20px_rgba(251,146,60,0.12)]`}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-[#b3b3b3] transition-colors duration-300 group-hover:border-[#fb923c]/25 group-hover:text-[#fdba74]">
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

      {/* Overlay + typing */}
      <section id="overlay" className="scroll-mt-24 border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">In-call overlay</h2>
              <p className="mt-3 text-[#b3b3b3]">
                A glass panel over your desktop: latest reply, screen-aware answers, and a single input — same flow as the
                real app.
              </p>
            </div>
          </FadeIn>
          <FadeIn delayMs={100} className="mt-12">
            <OverlayPreview />
          </FadeIn>
        </div>
      </section>

      {/* Live transcript mock */}
      <section id="live" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Meeting mode</h2>
              <p className="mt-3 text-[#b3b3b3]">See the conversation and the AI side-by-side — tuned for fast skim and copy-out.</p>
            </div>
          </FadeIn>
          <FadeIn delayMs={100} className="mt-12">
            <LiveMock />
          </FadeIn>
        </div>
      </section>

      {/* BYOK / models */}
      <section id="models" className="scroll-mt-24 border-t border-[#2a2a2a] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#121212] text-[#fdba74]">
                <IconKey className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your models. Your keys.</h2>
              <p className="mt-3 text-[#b3b3b3] sm:text-lg">
                ShadowAssist doesn&apos;t lock you into one vendor. Connect the providers you already pay for — fast inference,
                frontier reasoning, or open-weight models — all from one Settings hub.
              </p>
            </div>
          </FadeIn>

          <FadeIn delayMs={80} className="mt-12">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-5 sm:p-8">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#737373]">Supported providers</p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {providers.map((p) => (
                  <div
                    key={p.name}
                    className={`flex flex-col rounded-xl border px-3 py-3 transition-shadow duration-300 ${
                      p.featured
                        ? `border-[#fb923c]/50 bg-[#fb923c]/5 shadow-[0_0_24px_-8px_rgba(251,146,60,0.35)]`
                        : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className={`mt-1 text-[0.65rem] font-bold uppercase tracking-wider ${p.featured ? accentText : 'text-[#737373]'}`}>
                      {p.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delayMs={120} className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                t: 'Cost control',
                d: 'Use free tiers, speed-optimized endpoints, or premium models — switch per workspace without reinstalling.',
              },
              {
                t: 'Privacy posture',
                d: 'Requests go to the API base you configure. Keys live in your local settings, not baked into the installer.',
              },
              {
                t: 'Future-proof',
                d: 'OpenAI-compatible custom endpoints mean new providers and self-hosted stacks stay on the menu.',
              },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-5">
                <h3 className={`text-sm font-semibold ${accentText}`}>{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">{b.d}</p>
              </div>
            ))}
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
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fb923c] opacity-15 blur-[56px]"
              aria-hidden
            />
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
            <div className={`rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6`}>
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
            <Link to="/legal/privacy" className="text-sm text-[#b3b3b3] no-underline transition-colors hover:text-[#fdba74]">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-sm text-[#b3b3b3] no-underline transition-colors hover:text-[#fdba74]">
              Terms
            </Link>
            <Link to="/docs" className="text-sm text-[#b3b3b3] no-underline transition-colors hover:text-[#fdba74]">
              Docs
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
