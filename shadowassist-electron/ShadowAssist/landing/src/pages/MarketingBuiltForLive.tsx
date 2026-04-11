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
    title: 'Operational discretion',
    body: 'Hotkey-driven visibility, compact chrome, and local-first settings—built for environments where subtlety matters as much as throughput.',
  },
] as const

export function MarketingBuiltForLive() {
  return (
    <div className="min-w-0 bg-[#0a0a0a] px-4 py-14 text-white antialiased sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">Product</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built for live work</h1>
        <p className="mt-3 text-[#a1a1aa]">
          ShadowAssist is a Windows-native co-pilot layer: synchronous meetings, live document reviews, and any session
          where latency and situational awareness beat batch chat.
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
          Provider matrix, env vars, and security notes live in{' '}
          <Link to="/docs/getting-started" className="text-[#60a5fa] no-underline hover:underline">
            Getting started
          </Link>
          .
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
