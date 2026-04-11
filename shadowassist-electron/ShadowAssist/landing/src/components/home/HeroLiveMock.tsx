import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/components/ui/cn'

const USER_PROMPT = 'Contrast RAG with fine-tuning at scale'

const AI_FIRST =
  'Retrieval injects fresh evidence at inference time—higher p95 latency, materially lower factual drift when your corpus is curated. Fine-tuning reshapes the prior inside weights: capex-heavy to revise, excellent for tone and format. Production systems usually compose both. ShadowAssist keeps routing explicit: model + base URL in Settings, and only modalities you enable join the payload—no silent intermediary.'

const OCR_SNIPPET = `Q3_GTM_Brief.pdf · viewport
─────────────────────────────
North star: +12% YoY rev · GM 61% (steady state)
Critical risk: inference + egress concentrated us-east-1
Decision gate: pricing freeze for enterprise tier by 15 Nov`

const AI_SECOND =
  'Cross-referencing the captured region: growth and margin are both called out, with single-region concentration flagged as the operational risk and a hard date on pricing. I can distill that into exec bullets, a risk register line, or paste-ready copy for your stand-up—specify format.'

function typingDelay(char: string, fast: boolean): number {
  let base = fast ? 10 + Math.random() * 14 : 20 + Math.random() * 34
  if (char === ' ') base *= 0.55
  if ('.,—·'.includes(char)) base += 70 + Math.random() * 100
  if (Math.random() < 0.08) base += 100 + Math.random() * 180
  return base
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

type HeroLiveMockProps = {
  className?: string
}

export function HeroLiveMock({ className }: HeroLiveMockProps) {
  const reduceMotion = useReducedMotion()
  const [modeLabel, setModeLabel] = useState('Voice')
  const [userIdx, setUserIdx] = useState(0)
  const [ai1Idx, setAi1Idx] = useState(0)
  const [ai2Idx, setAi2Idx] = useState(0)
  const [ocrVisible, setOcrVisible] = useState(false)
  const [ocrChars, setOcrChars] = useState(0)
  const runId = useRef(0)

  useEffect(() => {
    if (reduceMotion) {
      setModeLabel('Live')
      setUserIdx(USER_PROMPT.length)
      setAi1Idx(AI_FIRST.length)
      setAi2Idx(AI_SECOND.length)
      setOcrVisible(true)
      setOcrChars(OCR_SNIPPET.length)
      return undefined
    }

    const id = ++runId.current
    let cancelled = false

    async function loop() {
      while (!cancelled && runId.current === id) {
        setModeLabel('Voice')
        setUserIdx(0)
        setAi1Idx(0)
        setAi2Idx(0)
        setOcrVisible(false)
        setOcrChars(0)

        for (let i = 0; i <= USER_PROMPT.length && !cancelled && runId.current === id; i++) {
          setUserIdx(i)
          if (i < USER_PROMPT.length) await wait(typingDelay(USER_PROMPT[i], false))
        }
        await wait(420)

        setModeLabel('Answer')
        for (let i = 0; i <= AI_FIRST.length && !cancelled && runId.current === id; i++) {
          setAi1Idx(i)
          if (i < AI_FIRST.length) await wait(typingDelay(AI_FIRST[i], true))
        }
        await wait(520)

        setModeLabel('Screen')
        setOcrVisible(true)
        for (let i = 0; i <= OCR_SNIPPET.length && !cancelled && runId.current === id; i++) {
          setOcrChars(i)
          if (i < OCR_SNIPPET.length) await wait(11 + Math.random() * 8)
        }
        await wait(640)

        setModeLabel('Answer')
        for (let i = 0; i <= AI_SECOND.length && !cancelled && runId.current === id; i++) {
          setAi2Idx(i)
          if (i < AI_SECOND.length) await wait(typingDelay(AI_SECOND[i], true))
        }

        setModeLabel('Live')
        await wait(2400)
      }
    }

    void loop()
    return () => {
      cancelled = true
      runId.current += 1
    }
  }, [reduceMotion])

  const showAi1Panel = userIdx >= USER_PROMPT.length
  const showAi2 = ocrChars >= OCR_SNIPPET.length && userIdx >= USER_PROMPT.length

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#121212] shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_24px_64px_-16px_rgba(0,0,0,0.65),0_0_80px_-24px_rgba(59,130,246,0.18)]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-[#3b82f6]/[0.06] before:via-transparent before:to-[#8b5cf6]/[0.07]',
        'motion-safe:animate-hero-float-mock max-md:motion-safe:[animation:none]',
        className
      )}
      animate={
        reduceMotion
          ? undefined
          : {
              boxShadow: [
                '0 0 0 1px rgba(59,130,246,0.12), 0 24px 64px -16px rgba(0,0,0,0.65), 0 0 80px -24px rgba(59,130,246,0.18)',
                '0 0 0 1px rgba(59,130,246,0.2), 0 28px 72px -14px rgba(0,0,0,0.6), 0 0 96px -20px rgba(59,130,246,0.26)',
                '0 0 0 1px rgba(59,130,246,0.12), 0 24px 64px -16px rgba(0,0,0,0.65), 0 0 80px -24px rgba(59,130,246,0.18)',
              ],
            }
      }
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#3b82f6]/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#8b5cf6]/12 blur-3xl" aria-hidden />

      <div className="relative flex items-center gap-3 border-b border-[#2a2a2a] px-4 py-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute h-8 w-8 rounded-full border border-[#3b82f6]/35 motion-safe:animate-signal-ring" aria-hidden />
          <span
            className="absolute h-8 w-8 rounded-full border border-[#8b5cf6]/25 motion-safe:animate-signal-ring [animation-delay:0.5s]"
            aria-hidden
          />
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-[#3b82f6] opacity-30" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.85)]" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#3b82f6]">Live capture</p>
          <p className="truncate text-[0.6875rem] font-medium text-[#a1a1aa]">ShadowAssist · {modeLabel}</p>
        </div>
        <span className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1 text-[0.65rem] font-mono text-[#a1a1aa]">REC</span>
      </div>

      <div className="relative space-y-3 p-4 sm:p-5">
        <div
          className={cn(
            'rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-[#a1a1aa] transition-opacity duration-300',
            userIdx > 0 ? 'opacity-100' : 'opacity-50'
          )}
        >
          <span className="text-[#52525b]">You · </span>
          {USER_PROMPT.slice(0, userIdx)}
          {userIdx < USER_PROMPT.length && !reduceMotion ? (
            <span
              className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#3b82f6] align-middle shadow-[0_0_8px_rgba(59,130,246,0.9)] motion-safe:animate-pulse"
              aria-hidden
            />
          ) : null}
        </div>

        <div
          className={cn(
            'space-y-2 rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#3b82f6]/[0.08] via-[#121212] to-[#8b5cf6]/[0.06] p-4 transition-all duration-500',
            showAi1Panel ? 'max-h-[640px] translate-y-0 opacity-100' : 'pointer-events-none max-h-0 translate-y-2 overflow-hidden opacity-0 py-0'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.65)] motion-safe:animate-pulse-soft" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Model output</p>
          </div>
          <p className="text-sm leading-relaxed text-white">
            {AI_FIRST.slice(0, ai1Idx)}
            {ai1Idx < AI_FIRST.length && !reduceMotion && showAi1Panel ? (
              <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#8b5cf6] align-middle motion-safe:animate-pulse" aria-hidden />
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            'rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3 font-mono text-[0.7rem] leading-relaxed transition-all duration-500',
            ocrVisible ? 'max-h-[260px] translate-y-0 opacity-100' : 'max-h-0 translate-y-2 overflow-hidden py-0 opacity-0'
          )}
        >
          <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-wider text-[#3b82f6]">Screen · structured extract</p>
          <pre className="whitespace-pre-wrap break-words text-[#a1a1aa]">{OCR_SNIPPET.slice(0, ocrChars)}</pre>
        </div>

        <div
          className={cn(
            'space-y-2 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-all duration-500',
            showAi2 ? 'max-h-[380px] translate-y-0 opacity-100' : 'pointer-events-none max-h-0 translate-y-2 overflow-hidden py-0 opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Grounded synthesis</p>
          </div>
          <p className="text-sm leading-relaxed text-white">
            {AI_SECOND.slice(0, ai2Idx)}
            {ai2Idx < AI_SECOND.length && !reduceMotion && showAi2 ? (
              <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#3b82f6] align-middle motion-safe:animate-pulse" aria-hidden />
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-lg border border-[#3b82f6]/25 bg-[#3b82f6]/10 px-2.5 py-1 text-[0.7rem] text-[#93c5fd]">
            Audio + viewport-grounded context
          </span>
          <span className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1 text-[0.7rem] text-[#a1a1aa]">
            Continuous preview · no API keys in-page
          </span>
        </div>
      </div>
    </motion.div>
  )
}
