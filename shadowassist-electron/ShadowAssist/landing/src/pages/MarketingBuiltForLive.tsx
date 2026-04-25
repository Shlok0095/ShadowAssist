import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

const bullets = [
  {
    title: 'Always-on-top without hijacking focus',
    body: 'The overlay floats above decks, terminals, and CRM tabs so you can read model output without alt-tabbing out of the narrative—or losing your place in a dense spreadsheet.',
  },
  {
    title: 'Grounding that cites the viewport',
    body: 'Screen capture is opt-in and scoped: structured text from what you actually have open informs completions, reducing confabulation compared to “memory-only” chat UIs.',
  },
  {
    title: 'BYOK as a control plane',
    body: 'Wire Groq, OpenAI, Anthropic, OpenRouter, Gemini, NVIDIA NIM, or any OpenAI-compatible endpoint. Swap latency-optimized vs. reasoning-heavy models per workload without reinstalling.',
  },
  {
    title: 'Meetings hub: calendar + recaps',
    body: 'Connect Google Calendar (your OAuth app) to see accepted meetings, optional Windows reminders before start, and a Meeting Summary list fed by Listen sessions—plain bullet recaps stored locally so they survive app restarts, with a text fallback if the LLM is unavailable.',
  },
  {
    title: 'Operational discretion',
    body: 'Hotkey-driven visibility, compact chrome, and local-first settings—built for environments where subtlety matters as much as throughput.',
  },
] as const

const ctaClass =
  'marketing-cta inline-flex items-center justify-center rounded-xl border border-[#3f3f46] bg-[#1f1f1f] px-5 py-3 font-display text-sm font-semibold tracking-wide text-zinc-50 shadow-[0_0_32px_-10px_rgba(0,0,0,0.55)] transition-[transform,box-shadow,background-color,border-color] hover:scale-[1.03] hover:border-[#52525b] hover:bg-[#2a2a2a]'

export function MarketingBuiltForLive() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] px-4 py-14 font-sans text-white antialiased sm:px-8 sm:py-20 md:px-10 lg:px-14">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Product</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Built for live work</h1>
        <p className="mt-3 font-mono text-sm leading-relaxed tracking-wide text-zinc-500">
          ShadowAssist is a Windows-native co-pilot layer: synchronous meetings, live document reviews, and any session
          where latency and situational awareness beat batch chat.
        </p>

        <ul className="mt-12 space-y-6">
          {bullets.map((b) => (
            <li key={b.title} className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-white">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed tracking-wide text-zinc-500">{b.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 font-mono text-sm tracking-wide text-zinc-600">
          Provider matrix, env vars, and security notes live in{' '}
          <Link to="/docs/getting-started" className="text-zinc-400 no-underline transition-colors hover:text-zinc-200">
            Getting started
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
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
