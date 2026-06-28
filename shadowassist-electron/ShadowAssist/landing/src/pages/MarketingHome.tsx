import { Link } from 'react-router-dom'
import { FaqAccordion } from '@/components/FaqAccordion'
import { DownloadBlock } from '@/components/marketing/DownloadBlock'
import { FeatureMarquee } from '@/components/marketing/FeatureMarquee'
import { ScrollReveal } from '@/components/marketing/ScrollReveal'
import { VideoPlaceholder } from '@/components/marketing/VideoPlaceholder'
import { APP_VERSION, SITE } from '@/config/site'

const PLATFORMS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Webex', 'Slack Huddles'] as const

const MEETING_STEPS = [
  {
    num: '01',
    title: 'VeilAssist listens in real time',
    body: 'Dual-path mic + system audio with on-device or cloud STT. The overlay picks up who said what while you stay in the call.',
    videoLabel: 'Live listening & transcript',
  },
  {
    num: '02',
    title: 'Instant help when you need it',
    body: 'Ctrl+Enter sends your screen and recent speech to a vision model. Answers stream live in the overlay and on your phone companion.',
    videoLabel: 'Assist hotkey & streaming answer',
  },
  {
    num: '03',
    title: 'Notes and recaps after the call',
    body: 'Optional session summaries, meeting search, and calendar hooks — stored locally on your machine, not in our cloud.',
    videoLabel: 'Meeting recap & summaries',
  },
] as const

const FEATURE_DEMOS = [
  {
    title: 'Screen-aware answers',
    desc: 'Vision models read your actual screen — code, slides, docs — without copy-paste.',
    videoLabel: 'Screen capture + vision assist',
  },
  {
    title: 'Phone companion',
    desc: 'Stream the same AI response to your phone over local Wi‑Fi while the overlay stays on desktop.',
    videoLabel: 'Phone link companion',
  },
  {
    title: 'Undetectable overlay',
    desc: 'Content protection, compact chrome, and hotkey-first UX — visible only when you summon it.',
    videoLabel: 'Overlay & invisibility',
  },
  {
    title: 'Profile & context modes',
    desc: 'Resume, job description, and reference files routed intelligently into each answer.',
    videoLabel: 'Context modes & routing',
  },
] as const

const UNDETECTABLE = [
  {
    title: 'No meeting bots',
    body: 'VeilAssist never joins your call as a participant. Nothing extra on the guest list.',
  },
  {
    title: 'Invisible to screen share',
    body: 'The overlay uses content protection so it does not appear in recordings or shared screens.',
  },
  {
    title: 'Moves with your eyes',
    body: 'Drag the panel anywhere on screen — position it where you are already looking.',
  },
] as const

const STATS = [
  { n: '12+', label: 'Languages', detail: 'English, Hindi, Hinglish, and cloud STT languages.' },
  { n: '<1s', label: 'First token', detail: 'Streaming answers in overlay and phone companion together.' },
  { n: 'BYOK', label: 'Your keys', detail: 'Groq, OpenAI, Anthropic, NVIDIA NIM — credentials stay local.' },
] as const

const FAQ = [
  {
    q: 'Why real-time assist instead of a notetaker only?',
    a: 'Most tools summarize after the meeting. VeilAssist helps while the conversation is still happening — when you need the answer, not tomorrow.',
  },
  {
    q: 'Is VeilAssist detectable in meetings?',
    a: 'There is no bot join link. The Windows overlay uses content protection and stays off shared screens. You control when it is visible.',
  },
  {
    q: 'Do I need an account or subscription?',
    a: 'No. Download the app, paste your own model API key in Settings, and go. We do not host your keys or charge a platform fee.',
  },
  {
    q: 'What providers are supported?',
    a: 'Vision-capable chat models from Groq, OpenAI, Anthropic, NVIDIA NIM, OpenRouter, and custom OpenAI-compatible endpoints.',
  },
  {
    q: 'Does it work on Mac?',
    a: 'Windows 10/11 today. macOS is on the roadmap.',
  },
] as const

export function MarketingHome() {
  return (
    <div className="relative min-w-0 font-sans text-white antialiased">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-8 pt-14 sm:px-8 sm:pt-20 md:px-10 lg:px-14 xl:px-16">
        <div className="relative z-[1] mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-blue-300/90 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_2px_rgba(59,130,246,0.55)] motion-safe:animate-pulse" />
              Windows · v{APP_VERSION}
            </p>
            <h1 className="font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
              <span className="block text-white">Undetectable AI</span>
              <span className="va-gradient-text mt-1 block">for live meetings</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="mt-6">
            <p className="mx-auto max-w-2xl text-base leading-[1.65] text-zinc-400 sm:text-lg">
              VeilAssist streams real-time answers on your screen while the call is still happening — grounded in what
              you see and hear. No bot joins the room.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="mt-10">
            <DownloadBlock layout="hero" />
            <p className="mt-4 font-mono text-xs text-zinc-600">macOS · coming later</p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.15} className="relative z-[1] mx-auto mt-14 max-w-5xl">
          <VideoPlaceholder label="Product overview — full walkthrough" aspect="wide" />
        </ScrollReveal>
      </section>

      {/* Demo quote strip (Cluely-style) */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 py-12 sm:px-8 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-lg font-semibold text-zinc-300 sm:text-xl">What should I say?</p>
          <blockquote className="mt-4 rounded-2xl border border-white/[0.08] bg-[#121216]/80 px-6 py-5 text-left text-sm leading-relaxed text-zinc-300 sm:text-base">
            “Walk them through the trade-off between latency and consistency in this architecture — keep it to three
            bullets they can repeat out loud.”
          </blockquote>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-zinc-600">
            Ctrl+Enter · Assist from screen + audio
          </p>
        </div>
      </section>

      <FeatureMarquee />

      {/* How it helps */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-8 md:px-10 lg:px-14 xl:px-16"
      >
        <div className="mx-auto max-w-[90rem]">
          <ScrollReveal>
            <p className="text-center font-mono text-xs uppercase tracking-[0.24em] text-blue-400/70">During the call</p>
            <h2 className="mt-3 text-center font-display text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl md:text-4xl">
              How VeilAssist helps in a meeting
            </h2>
          </ScrollReveal>

          <div className="mt-16 flex flex-col gap-20 lg:gap-24">
            {MEETING_STEPS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.05}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? 'lg:[direction:rtl]' : ''}`}
                >
                  <div className={i % 2 === 1 ? 'lg:[direction:ltr]' : ''}>
                    <span className="font-display text-5xl font-extrabold tracking-tighter text-blue-500/30">
                      {step.num}
                    </span>
                    <h3 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">{step.title}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">{step.body}</p>
                  </div>
                  <div className={i % 2 === 1 ? 'lg:[direction:ltr]' : ''}>
                    <VideoPlaceholder label={step.videoLabel} />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature demos */}
      <section
        id="features"
        className="scroll-mt-24 border-t border-white/[0.06] bg-white/[0.015] px-4 py-20 sm:px-8 md:px-10 lg:px-14 xl:px-16"
      >
        <div className="mx-auto max-w-[90rem]">
          <ScrollReveal>
            <h2 className="text-center font-display text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
              Built for how you actually work
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-500 sm:text-base">
              Feature demos will be added here — placeholders below are reserved for your recordings.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-2">
            {FEATURE_DEMOS.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.06}>
                <article className="va-glass-card flex h-full flex-col overflow-hidden rounded-2xl">
                  <VideoPlaceholder label={f.videoLabel} className="rounded-none border-0 [&>div]:rounded-none" />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Undetectable */}
      <section className="border-t border-white/[0.06] px-4 py-20 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto max-w-[90rem]">
          <ScrollReveal>
            <h2 className="text-center font-display text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
              Undetectable in every way
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-500">
              Designed to stay off the record — not on the participant list.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {UNDETECTABLE.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.06}>
                <article className="va-glass-card h-full rounded-2xl p-6 sm:p-7">
                  <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.12} className="mt-12">
            <VideoPlaceholder label="Undetectable overlay — screen share test" aspect="wide" />
          </ScrollReveal>
        </div>
      </section>

      {/* Platforms */}
      <section className="border-t border-white/[0.06] px-4 py-14 sm:px-8">
        <ScrollReveal>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">
            Works alongside
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {PLATFORMS.map((p) => (
              <li key={p} className="font-display text-sm font-semibold text-zinc-500 sm:text-base">
                {p}
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="border-t border-white/[0.06] bg-[#121216]/50 px-4 py-16 sm:px-8">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3 sm:gap-6">
          {STATS.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.05}>
              <div className="text-center">
                <span className="va-stat-num font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {s.n}
                </span>
                <span className="mt-2 block font-display text-sm font-bold text-white">{s.label}</span>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{s.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* BYOK */}
      <section id="byok" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-8 md:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Bring your own keys</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
              Pick Groq, OpenAI, Anthropic, or NVIDIA NIM — credentials live in local Settings, not our servers. You
              pay your provider directly.
            </p>
            <Link
              to="/docs/getting-started"
              className="mt-4 inline-block font-mono text-sm text-blue-400/90 underline decoration-blue-500/30 underline-offset-4 hover:text-blue-300"
            >
              Getting started guide →
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-8 md:px-10">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">FAQ</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.08} className="mt-10">
            <FaqAccordion items={[...FAQ]} />
          </ScrollReveal>
        </div>
      </section>

      {/* Download */}
      <section
        id="download"
        className="scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-8 md:px-10 lg:px-14 xl:px-16"
      >
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl md:text-4xl">
              Meeting AI that helps during the call
            </h2>
            <p className="mt-3 text-sm text-zinc-500 sm:text-base">Try VeilAssist on your next meeting today.</p>
          </ScrollReveal>
          <ScrollReveal delay={0.1} className="mt-10">
            <DownloadBlock />
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-sm font-semibold tracking-tight text-zinc-400">{SITE.name}</span>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs tracking-wide">
            <Link to="/legal/privacy" className="text-zinc-500 no-underline transition-colors hover:text-blue-300/90">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-zinc-500 no-underline transition-colors hover:text-blue-300/90">
              Terms
            </Link>
            <Link to="/docs" className="text-zinc-500 no-underline transition-colors hover:text-blue-300/90">
              Docs
            </Link>
            <a
              href={SITE.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 no-underline transition-colors hover:text-blue-300/90"
            >
              GitHub
            </a>
          </div>
          <p className="font-mono text-[11px] tracking-wide text-zinc-600">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </footer>
    </div>
  )
}
