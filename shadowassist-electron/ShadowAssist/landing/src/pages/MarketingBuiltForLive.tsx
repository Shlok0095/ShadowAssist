import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const bullets = [
  {
    title: 'Built for live calls',
    body: 'Overlay stays on top of slides, docs, and browsers. Read the room without breaking flow.',
  },
  {
    title: 'Screen-grounded answers',
    body: 'When you enable capture, the model can reference visible text and structure — not guesses from memory.',
  },
  {
    title: 'BYOK by design',
    body: 'Groq, OpenAI, Anthropic, OpenRouter, Gemini, and more — pick speed, cost, and compliance in Settings.',
  },
  {
    title: 'Discreet by default',
    body: 'Small footprint, hotkey-driven. You choose when the panel is visible.',
  },
] as const

export function MarketingBuiltForLive() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] px-4 py-14 text-white antialiased sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">Product</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built for live work</h1>
        <p className="mt-3 text-[#a1a1aa]">
          ShadowAssist is a native Windows layer for real-time intelligence — meetings, reviews, and deep sessions.
        </p>

        <ul className="mt-12 space-y-6">
          {bullets.map((b) => (
            <li key={b.title} className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6">
              <h2 className="text-lg font-semibold text-white">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">{b.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-[#71717a]">
          Technical setup and provider list: see{' '}
          <Link to="/docs/getting-started" className="text-[#60a5fa] no-underline hover:underline">
            Getting started
          </Link>{' '}
          in Docs.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#121212] px-5 py-3 text-sm font-medium text-white no-underline transition-colors hover:border-[#8b5cf6]/40"
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
