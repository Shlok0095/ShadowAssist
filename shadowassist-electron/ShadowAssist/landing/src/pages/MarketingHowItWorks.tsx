import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const steps = [
  {
    n: '01',
    title: 'Install the native shell',
    body: 'Run the Windows installer; ShadowAssist registers as a tray app with a standard uninstall entry—no Electron tab strip, no silent auto-updater unless you opt in later.',
  },
  {
    n: '02',
    title: 'Bind your provider + model',
    body: 'In Settings, paste API credentials and select a chat completion model. Keys never ship inside the binary; traffic goes straight to the HTTPS endpoint you configure.',
  },
  {
    n: '03',
    title: 'Invoke the overlay on demand',
    body: 'Map a global hotkey, then pull the panel over slides, IDEs, or the browser. Type prompts by default; enable listening or screen capture only when the workflow warrants it.',
  },
] as const

export function MarketingHowItWorks() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] px-4 py-14 text-white antialiased sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60a5fa]">Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How it works</h1>
        <p className="mt-3 text-[#a1a1aa]">
          From artifact download to first grounded answer—three deliberate steps, no hand-wavy onboarding.
        </p>

        <ol className="mt-12 space-y-8">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6">
              <span className="text-sm font-bold tabular-nums text-[#3b82f6]">{s.n}</span>
              <h2 className="mt-2 text-lg font-semibold text-white">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#121212] px-5 py-3 text-sm font-medium text-white no-underline transition-colors hover:border-[#3b82f6]/40"
          >
            ← Home
          </Link>
          <a
            href={SITE.downloadSetupExeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#3b82f6] px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_0_32px_-8px_rgba(59,130,246,0.55)] transition-[transform,box-shadow] hover:scale-[1.03] hover:shadow-[0_0_40px_-6px_rgba(59,130,246,0.65)]"
          >
            Download for Windows
          </a>
        </div>
      </div>
    </div>
  )
}
