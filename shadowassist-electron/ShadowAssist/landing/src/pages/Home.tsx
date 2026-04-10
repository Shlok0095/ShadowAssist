import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeroLiveMock } from '@/components/home/HeroLiveMock'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Badge, Button, Card, GradientText, Section } from '@/components/ui'
import { SITE } from '@/config/site'
import { usePointerGlow } from '@/hooks/usePointerGlow'

const downloadLinkRel = 'noopener noreferrer' as const

const easeOut = [0.22, 1, 0.36, 1] as const

function reveal(dir: -1 | 1) {
  return {
    initial: { opacity: 0, x: dir * 24, y: 12 },
    whileInView: { opacity: 1, x: 0, y: 0 },
    viewport: { once: true, margin: '-8%' },
    transition: { duration: 0.38, ease: easeOut },
  } as const
}

const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.03 },
  },
}

const heroChild = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
}

function IconOverlay() {
  return (
    <svg className="h-7 w-7 text-blue-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconKey() {
  return (
    <svg className="h-7 w-7 text-violet-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.5 8.5a3.5 3.5 0 10-4.95 4.95L7 18h3v-2h2v-2h2l1.05-1.05a3.5 3.5 0 004.45-5.45z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="9" r="1.25" fill="currentColor" />
    </svg>
  )
}

function IconMic() {
  return (
    <svg className="h-7 w-7 text-cyan-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 11v1a4 4 0 004 4M16 12v-1M12 19v2M8 21h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconBolt() {
  return (
    <svg className="h-7 w-7 text-cyan-300" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="h-7 w-7 text-violet-300" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconWindows() {
  return (
    <svg className="h-7 w-7 text-blue-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.45l7.5-1.05v7.2H3V5.45zm7.5 6.35v7.25L3 18v-6.2h7.5zm1.05-7.5L21 3v9.05h-9.45V4.3zm9.45 10.35H12.55V21L12.55 21 21 19.55v-4.9z" />
    </svg>
  )
}

const features = [
  {
    icon: <IconOverlay />,
    title: 'Real-time intelligence layer',
    desc: 'A floating panel that streams answers as the conversation moves — hotkeys, zero tab-hopping.',
  },
  {
    icon: <IconKey />,
    title: 'Your keys, your vendor',
    desc: 'Groq, OpenAI-compatible APIs, or NVIDIA NIM. Nothing sensitive ships inside the installer.',
  },
  {
    icon: <IconMic />,
    title: 'Context when you want it',
    desc: 'Optional listening and screen context with clear disclosures — you stay in control.',
  },
  {
    icon: <IconBolt />,
    title: 'Responds as things happen',
    desc: 'Swap models and routing in Settings without leaving the overlay.',
  },
  {
    icon: <IconShield />,
    title: 'On your machine',
    desc: 'Native Windows tray + overlay — not another guest on the roster.',
  },
  {
    icon: <IconWindows />,
    title: 'Standard Windows install',
    desc: 'A familiar installer (.exe) with shortcuts and an uninstall entry — ready for work machines.',
  },
]

function OverlayMock({ className }: { className?: string }) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-900/90 shadow-glass backdrop-blur-xl ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400/80" />
        <span className="ml-2 truncate text-[0.6875rem] font-medium uppercase tracking-wider text-zinc-500">
          ShadowAssist
        </span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">
          Summarize the last agenda block in three bullets…
        </div>
        <div className="space-y-2 rounded-xl border border-violet-500/30 bg-white/[0.05] p-4 text-sm leading-relaxed text-zinc-200">
          <p className="font-medium text-white">Suggested reply</p>
          <ul className="list-disc space-y-1 pl-4 text-zinc-300">
            <li>Design deadline locked for Thursday</li>
            <li>Legal review before the client sync</li>
            <li>Finance to confirm headcount by EOW</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-xs text-cyan-200/80">
            Understands your screen instantly
          </span>
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-500">
            BYOK · your endpoint
          </span>
        </div>
      </div>
    </div>
  )
}

export function Home() {
  const { ref: heroRef, onMouseMove, onMouseLeave } = usePointerGlow()

  return (
    <div className="min-w-0 overflow-x-hidden">
      {/* Hero — mobile: copy → CTA → mock; lg: two columns */}
      <Section flush className="relative overflow-hidden pb-14 pt-8 md:pb-20 md:pt-14 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.12),transparent_40%)] motion-safe:animate-hero-radial-breathe max-md:[animation:none]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.08),transparent_45%)]" />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_55%_15%,rgba(6,182,212,0.11),transparent_36%)] motion-safe:animate-hero-hue-veil max-md:[animation:none]"
            aria-hidden
          />
          <div
            className="absolute left-1/2 top-1/3 h-[min(100vw,640px)] w-[min(100vw,640px)] max-w-[100vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-600/15 via-violet-600/12 to-cyan-500/10 blur-3xl motion-safe:animate-aurora-drift max-md:[animation:none]"
            aria-hidden
          />
        </div>

        <div
          ref={heroRef}
          className="hero-spotlight relative z-[1]"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
          <div className="hero-cursor-glow" aria-hidden />
          <div className="hero-scan-sweep max-md:hidden" aria-hidden />

          <div className="relative z-[2] grid grid-cols-1 gap-10 md:gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
            <motion.div
              variants={heroContainer}
              initial="hidden"
              animate="visible"
              className="motion-safe:animate-hero-float-copy will-change-transform max-md:[animation:none] min-w-0 space-y-6 md:space-y-8"
            >
              <motion.div variants={heroChild}>
                <Badge className="mb-2 md:mb-0">Windows · Real-time AI layer</Badge>
              </motion.div>
              <motion.h1
                variants={heroChild}
                className="max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
              >
                Live intelligence{' '}
                <GradientText as="span" className="block sm:inline">
                  on your desktop
                </GradientText>
              </motion.h1>
              <motion.p
                variants={heroChild}
                className="max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg"
              >
                A real-time intelligence layer beside your work — not a bot in the call. Bring your own API keys; requests
                go straight to the provider you trust.
              </motion.p>
              <motion.div variants={heroChild} className="pt-2">
                <Button
                  href={SITE.downloadSetupExeUrl}
                  target="_blank"
                  rel={downloadLinkRel}
                  subtlePulse
                  downloadFeedback
                  className="w-full min-w-0 md:w-auto"
                >
                  Download for Windows
                </Button>
                <p className="mt-3 text-center text-sm text-zinc-500 md:text-left">No signup required</p>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative z-[2] min-w-0 motion-safe:animate-hero-float-mock will-change-transform max-md:[animation:none] lg:col-start-2 lg:row-start-1 lg:justify-self-end"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: easeOut, delay: 0.12 }}
            >
              <div
                className="pointer-events-none absolute -inset-6 rounded-[1.75rem] bg-gradient-accent-soft opacity-90 blur-3xl motion-safe:animate-glow-flicker max-md:[animation:none] md:-inset-8 md:rounded-[2rem]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl md:-right-6 md:-top-6 md:h-40 md:w-40"
                aria-hidden
              />
              <div className="relative transition-transform duration-200 md:hover:scale-[1.01]">
                <HeroLiveMock className="ring-1 ring-cyan-500/15" />
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Trust layer */}
      <Section compact className="relative z-[1] border-b border-white/[0.06] bg-[rgba(3,7,18,0.5)]">
        <motion.div
          className="flex flex-col gap-4 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-10 sm:gap-y-4"
          {...reveal(1)}
        >
          <span className="inline-flex max-w-full items-start gap-2.5 sm:max-w-md">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6a2 2 0 012-2h5l1 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M8 14h8M8 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 break-words">
              <span className="font-medium text-zinc-300">Runs locally on your device</span>
              <span className="text-zinc-500"> — overlay and tray app on Windows.</span>
            </span>
          </span>
          <span className="inline-flex max-w-full items-start gap-2.5 sm:max-w-md">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M13 2L4 14h6l-1 8 10-14h-6l0-6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="min-w-0 break-words">
              <span className="font-medium text-zinc-300">We don’t proxy your prompts</span>
              <span className="text-zinc-500"> — traffic goes straight to the AI provider you configure.</span>
            </span>
          </span>
        </motion.div>
      </Section>

      {/* Trust strip */}
      <Section compact className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02]">
        <motion.div
          className="flex flex-col items-center justify-center gap-6 text-center md:flex-row md:gap-12"
          {...reveal(-1)}
        >
          <p className="max-w-md text-base font-medium leading-snug text-zinc-300 md:text-lg">
            Built for live calls on Windows — discreet, fast, and always under your control.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <span className="rounded-full border border-cyan-500/15 bg-night-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-4">
              BYOK
            </span>
            <span className="rounded-full border border-white/10 bg-night-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-4">
              No roster guest
            </span>
          </div>
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features" className="relative z-[1]">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(1)}>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Engineered for live signal
          </h2>
          <p className="mt-4 text-base text-zinc-400 md:mt-6 md:text-lg">
            Overlay, providers you choose, and a clean install — without generic SaaS fluff.
          </p>
        </motion.div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 md:gap-6 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} {...reveal(i % 2 === 0 ? -1 : 1)}>
              <Card interactive className="flex h-full min-w-0 flex-col gap-4 p-6 md:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Preview */}
      <Section id="preview" className="relative z-[1] pb-16 md:pb-24">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(-1)}>
          <Badge className="mb-4 md:mb-6">System preview</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Native glass. Quiet footprint.
          </h2>
          <p className="mt-4 text-base text-zinc-400 md:mt-6 md:text-lg">
            Understands your screen instantly when you enable it — tuned for clarity, not clutter.
          </p>
        </motion.div>
        <motion.div className="relative z-[1] mx-auto mt-10 max-w-4xl md:mt-14" {...reveal(1)}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-[2rem] bg-gradient-to-br from-blue-500/25 via-violet-500/20 to-cyan-500/20 opacity-80 blur-3xl max-md:opacity-60"
            aria-hidden
          />
          <div className="relative rounded-2xl border border-white/10 bg-night-950/40 p-3 shadow-glow sm:rounded-[1.75rem] sm:p-6 md:p-8">
            <OverlayMock />
          </div>
        </motion.div>
      </Section>

      {/* Download — single native &lt;a href&gt; */}
      <Section id="download" className="relative z-[1] pb-16 md:pb-24">
        <motion.div className="mx-auto max-w-lg text-center" {...reveal(-1)}>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">Download ShadowAssist</h2>
          <p className="mt-3 text-base text-zinc-400 md:mt-4 md:text-lg">
            Get the Windows app in one click. No account, no extra steps.
          </p>
        </motion.div>

        <motion.div className="relative z-[1] mx-auto mt-10 max-w-lg md:mt-12" {...reveal(1)}>
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 sm:p-8 md:p-10">
            <div className="flex flex-col items-stretch gap-6">
              <Button
                href={SITE.downloadSetupExeUrl}
                target="_blank"
                rel={downloadLinkRel}
                subtlePulse
                downloadFeedback
                className="w-full min-w-0"
              >
                Download for Windows
              </Button>
              <ul className="space-y-3 border-t border-white/10 pt-6 text-left text-sm text-zinc-300">
                <li className="flex flex-wrap gap-x-2 break-words">
                  <span className="font-medium text-zinc-400">System</span>
                  <span>Windows 10 or Windows 11 · 64-bit</span>
                </li>
                <li className="flex flex-wrap gap-x-2 break-words">
                  <span className="font-medium text-zinc-400">Size</span>
                  <span>About 80–150 MB (varies by release)</span>
                </li>
                <li className="flex flex-wrap gap-x-2 break-words">
                  <span className="font-medium text-zinc-400">Account</span>
                  <span>No signup required</span>
                </li>
              </ul>
              <p className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-300">SmartScreen</span> — Windows may show a SmartScreen warning.
                This is normal for new apps.
              </p>
            </div>
          </Card>
        </motion.div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="relative z-[1] pb-16 md:pb-24">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(-1)}>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">Questions</h2>
          <p className="mt-3 text-base text-zinc-400">Keys, privacy, and installs.</p>
        </motion.div>
        <motion.div className="relative z-[1] mx-auto mt-8 max-w-3xl md:mt-12" {...reveal(1)}>
          <FaqAccordion
            items={[
              {
                q: 'Are API keys inside the download?',
                a: 'No. You add credentials after install.',
              },
              {
                q: 'Will others fail to notice I’m using it?',
                a: 'We aim for a discreet overlay but can’t guarantee invisibility. Follow your org and platform rules.',
              },
              {
                q: 'Where are prompts processed?',
                a: (
                  <>
                    At the AI provider you configure. See <Link to="/legal/privacy">privacy</Link>.
                  </>
                ),
              },
              {
                q: 'Why does SmartScreen warn?',
                a: 'Windows may show a SmartScreen warning. This is normal for new apps.',
              },
              {
                q: 'Skip the desktop shortcut?',
                a: 'Yes — the installer finish page includes an optional checkbox.',
              },
            ]}
          />
        </motion.div>
      </Section>
    </div>
  )
}
