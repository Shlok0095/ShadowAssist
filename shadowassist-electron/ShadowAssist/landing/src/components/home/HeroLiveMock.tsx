import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/components/ui/cn'

const PROMPT = 'Map the decision → three crisp bullets for the room…'

type HeroLiveMockProps = {
  className?: string
}

function nextTypingDelay(charIndex: number): number {
  const ch = PROMPT[charIndex]
  let base = 28 + Math.random() * 56
  if (ch === ' ') base *= 0.65
  if ('.,→—'.includes(ch)) base += 80 + Math.random() * 120
  if (Math.random() < 0.12) base += 160 + Math.random() * 220
  return base
}

export function HeroLiveMock({ className }: HeroLiveMockProps) {
  const reduceMotion = useReducedMotion()
  const [charIndex, setCharIndex] = useState(0)
  const [showResponse, setShowResponse] = useState(false)
  const [cursorPeriod, setCursorPeriod] = useState(0.85 + Math.random() * 0.45)
  const timeoutRef = useRef(0)

  useEffect(() => {
    if (reduceMotion) {
      setCharIndex(PROMPT.length)
      setShowResponse(true)
      return
    }
    if (charIndex >= PROMPT.length) {
      timeoutRef.current = window.setTimeout(() => setShowResponse(true), 320)
      return () => window.clearTimeout(timeoutRef.current)
    }
    const delay = nextTypingDelay(charIndex)
    timeoutRef.current = window.setTimeout(() => setCharIndex((c) => c + 1), delay)
    return () => window.clearTimeout(timeoutRef.current)
  }, [charIndex, reduceMotion])

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => {
      setCursorPeriod(0.72 + Math.random() * 0.55)
    }, 1400 + Math.random() * 900)
    return () => window.clearInterval(id)
  }, [reduceMotion])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-night-900/95 shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_24px_64px_-12px_rgba(0,0,0,0.55)]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:via-transparent before:to-violet-500/10',
        className
      )}
    >
      <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute h-8 w-8 rounded-full border border-cyan-400/30 motion-safe:animate-signal-ring" aria-hidden />
          <span
            className="absolute h-8 w-8 rounded-full border border-violet-400/25 motion-safe:animate-signal-ring [animation-delay:0.55s]"
            aria-hidden
          />
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-cyan-400 opacity-35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-400/90">Live stream</p>
          <p className="truncate text-[0.6875rem] font-medium text-zinc-500">ShadowAssist · real-time intelligence layer</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-mono text-zinc-500">
          REC
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-zinc-300">
          <span className="text-zinc-500">{'>'} </span>
          {PROMPT.slice(0, charIndex)}
          <span
            className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-cyan-400 align-middle shadow-[0_0_8px_rgba(6,182,212,0.85)] motion-reduce:opacity-100"
            style={{
              animation: reduceMotion ? undefined : `sa-cursor-blink ${cursorPeriod}s steps(1, end) infinite`,
            }}
            aria-hidden
          />
        </div>

        <div
          className={cn(
            'space-y-2 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 p-4 transition-[opacity,transform] duration-500 ease-out',
            showResponse ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.7)] motion-safe:animate-pulse-soft" />
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">Synthesizing</p>
          </div>
          <ul className="list-none space-y-2 text-sm leading-snug text-zinc-200">
            <li className="flex gap-2">
              <span className="text-cyan-400">▸</span>
              Pilot scope: two regions, checkpoint at day 30.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400">▸</span>
              Risk: legal sign-off before external demo.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400">▸</span>
              Next: finance confirms headcount by Thursday.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-[0.7rem] text-cyan-200/80">
            Understands your screen instantly
          </span>
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] text-zinc-500">
            Responds as things happen
          </span>
        </div>
      </div>
    </div>
  )
}
