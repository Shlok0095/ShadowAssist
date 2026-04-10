import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeroLiveMock } from '@/components/home/HeroLiveMock'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Badge, Button, buttonClass, Card, GradientText, Section } from '@/components/ui'
import { SITE } from '@/config/site'
import { usePointerGlow } from '@/hooks/usePointerGlow'
import { useRollingReleaseMeta } from '@/hooks/useRollingReleaseMeta'

const downloadLinkRel = 'noopener noreferrer' as const

const easeOut = [0.22, 1, 0.36, 1] as const

function reveal(dir: -1 | 1) {
  return {
    initial: { opacity: 0, x: dir * 32, y: 16 },
    whileInView: { opacity: 1, x: 0, y: 0 },
    viewport: { once: true, margin: '-10%' },
    transition: { duration: 0.4, ease: easeOut },
  } as const
}

const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
  },
}

const heroChild = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
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
    title: 'Installer or portable',
    desc: 'Full Windows Installer (.exe) or a single portable .exe — pick what fits your workflow.',
  },
]

function OverlayMock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-night-900/90 shadow-glass backdrop-blur-xl ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[0.6875rem] font-medium uppercase tracking-wider text-zinc-500">ShadowAssist</span>
      </div>
      <div className="space-y-4 p-5">
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
        <div className="flex gap-2">
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
  const downloadMeta = useRollingReleaseMeta()
  const { ref: heroRef, onMouseMove, onMouseLeave } = usePointerGlow()

  return (
    <>
      {/* Hero */}
      <Section flush className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.12),transparent_40%)] motion-safe:animate-hero-radial-breathe" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.08),transparent_45%)]" />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_55%_15%,rgba(6,182,212,0.11),transparent_36%)] motion-safe:animate-hero-hue-veil"
            aria-hidden
          />
          <div
            className="absolute left-1/2 top-1/3 h-[min(100vw,640px)] w-[min(100vw,640px)] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-600/15 via-violet-600/12 to-cyan-500/10 blur-3xl motion-safe:animate-aurora-drift"
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
          <div className="hero-scan-sweep" aria-hidden />
          <div className="relative z-[2] grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20">
            <motion.div
              variants={heroContainer}
              initial="hidden"
              animate="visible"
              className="motion-safe:animate-hero-float-copy will-change-transform"
            >
              <motion.div variants={heroChild}>
                <Badge className="mb-8">Windows · Real-time AI layer</Badge>
              </motion.div>
              <motion.h1
                variants={heroChild}
                className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Live intelligence{' '}
                <GradientText as="span" className="block sm:inline">
                  on your desktop
                </GradientText>
              </motion.h1>
              <motion.p
                variants={heroChild}
                className="mt-8 max-w-lg text-lg leading-relaxed text-zinc-400 sm:text-xl"
              >
                A real-time intelligence layer beside your work — not a bot in the call. Bring your own API keys; requests
                go straight to the provider you trust.
              </motion.p>
              <motion.div variants={heroChild} className="mt-12">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button
                    href={SITE.downloadSetupExeUrl}
                    target="_blank"
                    rel={downloadLinkRel}
                    subtlePulse
                    downloadFeedback
                  >
                    Windows Installer (.exe)
                  </Button>
                  <Button
                    variant="secondary"
                    href={SITE.downloadPortableExeUrl}
                    target="_blank"
                    rel={downloadLinkRel}
                    downloadFeedback
                  >
                    Portable (.exe)
                  </Button>
                </div>
                <p className="mt-4 max-w-md text-center text-[0.8125rem] leading-relaxed text-zinc-500 sm:text-left">
                  No signup required · Instant install
                </p>
              </motion.div>
              <motion.p
                variants={heroChild}
                className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500"
              >
                <Link to="/docs/getting-started" className="text-zinc-400 underline-offset-4 hover:text-white hover:underline">
                  Setup guide
                </Link>
                <span className="hidden text-zinc-600 sm:inline">·</span>
                <Link to="/docs/how-it-works" className="text-zinc-400 underline-offset-4 hover:text-white hover:underline">
                  How it works
                </Link>
                <span className="hidden text-zinc-600 sm:inline">·</span>
                <a
                  href={SITE.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                >
                  GitHub
                </a>
              </motion.p>
            </motion.div>

            <motion.div
              className="relative z-[2] motion-safe:animate-hero-float-mock will-change-transform lg:justify-self-end"
              initial={{ opacity: 0, x: 36, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.65, ease: easeOut, delay: 0.2 }}
            >
              <div
                className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-accent-soft opacity-90 blur-3xl motion-safe:animate-glow-flicker"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl"
                aria-hidden
              />
              <div className="relative transition-transform duration-200 hover:scale-[1.02]">
                <HeroLiveMock className="ring-1 ring-cyan-500/15" />
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Trust layer — factual; prompts go to user-configured APIs */}
      <Section compact className="relative z-[1] border-b border-white/[0.06] bg-[rgba(3,7,18,0.5)] py-5">
        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 px-2 text-sm text-zinc-400"
          {...reveal(1)}
        >
          <span className="inline-flex max-w-md items-center gap-2.5 text-left">
            <svg className="h-4 w-4 shrink-0 text-cyan-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6a2 2 0 012-2h5l1 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M8 14h8M8 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>
              <span className="font-medium text-zinc-300">Runs locally on your device</span>
              <span className="text-zinc-500"> — overlay & tray app on Windows.</span>
            </span>
          </span>
          <span className="inline-flex max-w-md items-start gap-2.5 text-left">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M13 2L4 14h6l-1 8 10-14h-6l0-6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <span className="font-medium text-zinc-300">We don’t proxy your prompts</span>
              <span className="text-zinc-500"> — traffic goes straight to the AI provider you configure.</span>
            </span>
          </span>
        </motion.div>
      </Section>

      {/* Trust */}
      <Section compact className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02]">
        <motion.div
          className="flex flex-col items-center justify-center gap-6 text-center sm:flex-row sm:gap-12"
          {...reveal(-1)}
        >
          <p className="max-w-md text-base font-medium text-zinc-300 sm:text-lg">
            Built for live calls on Windows — discreet, fast, and always under your control.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-cyan-500/15 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              BYOK
            </span>
            <span className="rounded-full border border-violet-500/15 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Open builds
            </span>
            <span className="rounded-full border border-white/10 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              No roster guest
            </span>
          </div>
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features" className="relative z-[1]">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(1)}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Engineered for live signal
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Overlay, providers you choose, and installs that match how you work — without the generic SaaS fluff.
          </p>
        </motion.div>
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} {...reveal(i % 2 === 0 ? -1 : 1)}>
              <Card interactive className="flex h-full flex-col gap-4 p-8">
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

      {/* Product preview */}
      <Section id="preview" className="relative z-[1] pb-28 sm:pb-36">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(-1)}>
          <Badge className="mb-6">System preview</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Native glass. Quiet footprint.</h2>
          <p className="mt-6 text-lg text-zinc-400">
            Understands your screen instantly when you enable it — tuned for clarity, not chrome overload.
          </p>
        </motion.div>
        <motion.div className="relative z-[1] mx-auto mt-16 max-w-4xl" {...reveal(1)}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-[2.5rem] bg-gradient-to-br from-blue-500/25 via-violet-500/20 to-cyan-500/20 opacity-80 blur-3xl"
            aria-hidden
          />
          <div className="relative rounded-[1.75rem] border border-white/10 bg-night-950/40 p-4 shadow-glow backdrop-blur-sm sm:p-8">
            <OverlayMock />
          </div>
        </motion.div>
      </Section>

      {/* Download — plain <a href> only; API is display-only */}
      <Section id="download" className="relative z-[1] pb-28 sm:pb-36">
        <motion.div className="mx-auto max-w-3xl text-center" {...reveal(-1)}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Download ShadowAssist</h2>
          <p className="mt-6 text-lg text-zinc-400">
            Always up to date on Windows. Direct downloads — no scripts, no redirects.
          </p>
        </motion.div>

        <motion.div className="relative z-[1] mx-auto mt-14 max-w-3xl" {...reveal(1)}>
          <Card interactive className="border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 sm:p-12">
            <p className="text-center text-sm text-zinc-400" aria-live="polite">
              {downloadMeta.kind === 'loading' && <span>Checking latest version…</span>}
              {downloadMeta.kind === 'ok' && (
                <>
                  Latest Version: <span className="font-semibold text-zinc-200">{downloadMeta.tag}</span>
                  <span className="text-zinc-500"> · Always up to date</span>
                  {downloadMeta.updatedLabel ? (
                    <>
                      {' '}
                      <span className="text-zinc-500">· Updated {downloadMeta.updatedLabel}</span>
                    </>
                  ) : null}
                </>
              )}
              {downloadMeta.kind === 'error' && (
                <span className="text-amber-200/90">Version info unavailable — downloads below still work.</span>
              )}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  href={SITE.downloadSetupExeUrl}
                  target="_blank"
                  rel={downloadLinkRel}
                  className="min-w-[14rem]"
                  subtlePulse
                  downloadFeedback
                >
                  Windows Installer (.exe)
                </Button>
                <Button
                  variant="secondary"
                  href={SITE.downloadPortableExeUrl}
                  target="_blank"
                  rel={downloadLinkRel}
                  className="min-w-[14rem]"
                  downloadFeedback
                >
                  Portable (.exe)
                </Button>
              </div>
              <p className="w-full text-center text-[0.8125rem] text-zinc-500 sm:max-w-xl">
                No signup required · Instant install
              </p>
            </div>

            <dl className="mt-12 grid gap-6 border-t border-white/10 pt-10 text-left text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Approx. download size</dt>
                <dd className="mt-2 text-zinc-300">~80–150 MB (varies by release)</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">OS support</dt>
                <dd className="mt-2 text-zinc-300">Windows 10 / 11 · 64-bit</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SmartScreen</dt>
                <dd className="mt-2 text-zinc-300">
                  Windows may show a SmartScreen warning. This is normal for new apps. Verify with{' '}
                  <span className="text-zinc-200">SHA256 checksums</span> when you need extra assurance.
                </dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
              <a
                href={SITE.releasesRollingUrl}
                target="_blank"
                rel={downloadLinkRel}
                className="text-zinc-400 underline-offset-4 hover:text-white hover:underline"
              >
                View on GitHub
              </a>
              <a
                href={SITE.checksumsTxtUrl}
                target="_blank"
                rel={downloadLinkRel}
                className="text-zinc-400 underline-offset-4 hover:text-white hover:underline"
              >
                SHA256 checksums
              </a>
              <Link to="/docs/getting-started" className={buttonClass('ghost', 'min-h-0 px-4 py-2 text-sm')}>
                Read setup guide
              </Link>
            </div>
          </Card>
        </motion.div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="relative z-[1] pb-32">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal(-1)}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions</h2>
          <p className="mt-4 text-zinc-400">Keys, privacy, installs — direct answers.</p>
        </motion.div>
        <motion.div className="relative z-[1] mx-auto mt-12 max-w-3xl" {...reveal(1)}>
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
                a: 'Windows may show a SmartScreen warning. This is normal for new apps. Use SHA256 checksums on the release when you want to verify the file.',
              },
              {
                q: 'Installer vs portable?',
                a: 'Portable is one .exe file. The Windows Installer adds shortcuts and an uninstall entry.',
              },
              {
                q: 'Skip the desktop shortcut?',
                a: 'Yes — the installer finish page includes an optional checkbox.',
              },
            ]}
          />
        </motion.div>
      </Section>
    </>
  )
}
