import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaqAccordion } from '@/components/FaqAccordion'
import { Badge, Button, buttonClass, Card, GradientText, Section } from '@/components/ui'
import { SITE } from '@/config/site'
import { useRollingReleaseMeta } from '@/hooks/useRollingReleaseMeta'

const downloadLinkRel = 'noopener noreferrer' as const

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-48px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
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
    <svg className="h-7 w-7 text-teal-400" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className="h-7 w-7 text-sky-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.45l7.5-1.05v7.2H3V5.45zm7.5 6.35v7.25L3 18v-6.2h7.5zm1.05-7.5L21 3v9.05h-9.45V4.3zm9.45 10.35H12.55V21L12.55 21 21 19.55v-4.9z" />
    </svg>
  )
}

const features = [
  {
    icon: <IconOverlay />,
    title: 'Floating overlay',
    desc: 'Streamed answers in a low-profile panel — hotkeys keep you in flow on calls.',
  },
  {
    icon: <IconKey />,
    title: 'Bring your own keys',
    desc: 'Groq, OpenAI-compatible APIs, or NVIDIA NIM. No vendor keys ship in the download.',
  },
  {
    icon: <IconMic />,
    title: 'Optional context',
    desc: 'Session listening and screen context when you want them, with clear in-app disclosures.',
  },
  {
    icon: <IconBolt />,
    title: 'Fast iteration',
    desc: 'Swap models and routing in Settings without leaving the overlay.',
  },
  {
    icon: <IconShield />,
    title: 'On your machine',
    desc: 'Native Windows tray + overlay — not another name on the meeting roster.',
  },
  {
    icon: <IconWindows />,
    title: 'Installer or portable',
    desc: 'NSIS wizard with shortcuts, or a single portable .exe — your call.',
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
        <div className="space-y-2 rounded-xl border border-violet-500/25 bg-white/[0.06] p-4 text-sm leading-relaxed text-zinc-200">
          <p className="font-medium text-white">Suggested reply</p>
          <ul className="list-disc space-y-1 pl-4 text-zinc-300">
            <li>Design deadline locked for Thursday</li>
            <li>Legal review before the client sync</li>
            <li>Finance to confirm headcount by EOW</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-500">
            Ctrl+Shift+Space
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

  return (
    <>
      {/* Hero */}
      <Section flush className="pb-16 pt-10 sm:pb-24 sm:pt-16">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20">
          <motion.div {...fade}>
            <Badge className="mb-8">Windows · Desktop AI overlay</Badge>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Live meeting help{' '}
              <GradientText as="span" className="block sm:inline">
                on your desktop
              </GradientText>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Concise answers beside your work — without joining the call as a bot. You bring your own API keys; traffic
              goes to the provider you trust.
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadLinkRel}>
                Download for Windows
              </Button>
              <Button variant="secondary" href={SITE.downloadPortableExeUrl} target="_blank" rel={downloadLinkRel}>
                Portable version
              </Button>
            </div>
            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500">
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
            </p>
          </motion.div>

          <motion.div
            className="relative lg:justify-self-end"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <div
              className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-accent-soft opacity-90 blur-3xl"
              aria-hidden
            />
            <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" aria-hidden />
            <div className="relative rotate-[1.5deg] transition-transform duration-200 hover:scale-[1.02] hover:rotate-0">
              <OverlayMock className="ring-1 ring-white/10" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Trust */}
      <Section compact className="border-y border-white/[0.06] bg-white/[0.02]">
        <motion.div
          className="flex flex-col items-center justify-center gap-6 text-center sm:flex-row sm:gap-12"
          {...fade}
        >
          <p className="max-w-md text-base font-medium text-zinc-300 sm:text-lg">
            Built for real-time AI workflows on Windows — discreet, fast, and under your control.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-white/10 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              BYOK
            </span>
            <span className="rounded-full border border-white/10 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Open builds
            </span>
            <span className="rounded-full border border-white/10 bg-night-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              No meeting roster entry
            </span>
          </div>
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features">
        <motion.div className="mx-auto max-w-2xl text-center" {...fade}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Everything you need for live calls
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            A focused toolkit: overlay, providers you choose, and installs that match how you work.
          </p>
        </motion.div>
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} {...fade} transition={{ ...fade.transition, delay: i * 0.04 }}>
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
      <Section id="preview" className="pb-28 sm:pb-36">
        <motion.div className="mx-auto max-w-2xl text-center" {...fade}>
          <Badge className="mb-6">Product preview</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Looks native. Stays quiet.</h2>
          <p className="mt-6 text-lg text-zinc-400">
            A glass overlay that sits on your desktop — tuned for readability and speed, not spectacle.
          </p>
        </motion.div>
        <motion.div className="relative mx-auto mt-16 max-w-4xl" {...fade}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-[2.5rem] bg-gradient-to-br from-blue-500/25 via-violet-500/20 to-teal-500/20 opacity-80 blur-3xl"
            aria-hidden
          />
          <div className="relative rounded-[1.75rem] border border-white/10 bg-night-950/40 p-4 shadow-glow backdrop-blur-sm sm:p-8">
            <OverlayMock />
          </div>
        </motion.div>
      </Section>

      {/* Download */}
      <Section id="download" className="pb-28 sm:pb-36">
        <motion.div className="mx-auto max-w-3xl text-center" {...fade}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Download ShadowAssist</h2>
          <p className="mt-6 text-lg text-zinc-400">Latest rolling build for Windows. Verify checksums when you can.</p>
        </motion.div>

        <motion.div className="mx-auto mt-14 max-w-3xl" {...fade}>
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 sm:p-12">
            <p className="text-center text-sm text-zinc-400" aria-live="polite">
              {downloadMeta.kind === 'loading' && <span>Latest build: …</span>}
              {downloadMeta.kind === 'ok' && (
                <>
                  Latest build: <span className="font-semibold text-zinc-200">{downloadMeta.tag}</span>
                  {downloadMeta.updatedLabel ? (
                    <>
                      {' '}
                      · Updated {downloadMeta.updatedLabel}
                    </>
                  ) : null}
                </>
              )}
              {downloadMeta.kind === 'error' && <span className="text-amber-200/90">Unable to fetch version metadata</span>}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button href={SITE.downloadSetupExeUrl} target="_blank" rel={downloadLinkRel} className="min-w-[14rem]">
                Windows installer
              </Button>
              <Button
                variant="secondary"
                href={SITE.downloadPortableExeUrl}
                target="_blank"
                rel={downloadLinkRel}
                className="min-w-[14rem]"
              >
                Portable .exe
              </Button>
            </div>

            <dl className="mt-12 grid gap-6 border-t border-white/10 pt-10 text-left text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Approx. size</dt>
                <dd className="mt-2 text-zinc-300">~80–150 MB (Electron; varies by release)</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">OS support</dt>
                <dd className="mt-2 text-zinc-300">Windows 10 / 11 · 64-bit</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SmartScreen</dt>
                <dd className="mt-2 text-zinc-300">
                  New or unsigned builds may show a warning. Use <span className="text-zinc-200">SHA256SUMS.txt</span> on
                  the release to verify.
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
      <Section id="faq" className="pb-32">
        <motion.div className="mx-auto max-w-2xl text-center" {...fade}>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions</h2>
          <p className="mt-4 text-zinc-400">Straight answers about keys, privacy, and installs.</p>
        </motion.div>
        <motion.div className="mx-auto mt-12 max-w-3xl" {...fade}>
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
                a: 'New unsigned Windows builds are often flagged. Use SHA256SUMS.txt on the release when you can.',
              },
              {
                q: 'Installer vs portable?',
                a: 'Portable is one file. The installer adds shortcuts and an uninstall entry.',
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
