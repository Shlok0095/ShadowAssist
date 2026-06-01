import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const steps = [
  {
    title: 'Install',
    body: 'Run the Windows installer. ShadowAssist lives in the system tray with a standard uninstall entry.',
  },
  {
    title: 'Add your API key and model',
    body: 'In Settings, paste API credentials and pick a chat model. Keys stay on your device; traffic goes to the provider you choose.',
  },
  {
    title: 'Use the overlay',
    body: 'Open the panel with a hotkey over slides, IDEs, or the browser. Type questions or enable listening and screen context when you need them.',
  },
  {
    title: 'Calendar and session recaps (optional)',
    body: 'Connect Google Calendar for upcoming meetings and reminders. Ending a listen session can save a short bullet recap locally.',
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
          Download, connect your provider, and start using the overlay.
        </p>

        <ol className="mt-12 space-y-8">
          {steps.map((s) => (
            <li key={s.title} className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-white">{s.title}</h2>
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
