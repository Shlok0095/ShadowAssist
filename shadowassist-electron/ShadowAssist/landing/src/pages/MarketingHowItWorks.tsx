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
  {
    n: '04',
    title: 'Optional calendar & session recaps',
    body: 'Wire Google Calendar if you want accepted meetings in one list and light reminders. Ending a listen session can produce a short bullet recap stored locally. Persona: built-in default or your own profile text—same as in the app.',
  },
] as const

const ctaClass =
  'marketing-cta inline-flex items-center justify-center rounded-xl border border-[#3f3f46] bg-[#1f1f1f] px-5 py-3 font-display text-sm font-semibold tracking-wide text-zinc-50 shadow-[0_0_32px_-10px_rgba(0,0,0,0.55)] transition-[transform,box-shadow,background-color,border-color] hover:scale-[1.03] hover:border-[#52525b] hover:bg-[#2a2a2a]'

export function MarketingHowItWorks() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] px-4 py-14 font-sans text-white antialiased sm:px-8 sm:py-20 md:px-10 lg:px-14">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Guide</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">How it works</h1>
        <p className="mt-3 font-mono text-sm leading-relaxed tracking-wide text-zinc-500">
          From artifact download to first grounded answer—four deliberate steps, no hand-wavy onboarding.
        </p>

        <ol className="mt-12 space-y-8">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 sm:p-7">
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-400">{s.n}</span>
              <h2 className="mt-2 font-display text-lg font-semibold tracking-[-0.01em] text-white">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed tracking-wide text-zinc-500">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#121212] px-5 py-3 text-sm font-medium text-zinc-200 no-underline transition-colors hover:border-zinc-600 hover:text-white"
          >
            ← Home
          </Link>
          <a href={SITE.downloadSetupExeUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>
            Download for Windows
          </a>
        </div>
      </div>
    </div>
  )
}
