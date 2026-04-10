// Copyright (c) 2026 ShadowAssist. All rights reserved.

import React, { useRef, useEffect } from 'react'

/** Side-by-side live captions: Me (local mic) vs Participant (system / loopback). */
export default function LiveTranscriptPanel({ segments = [], visible = true, className = '' }) {
  const meColRef = useRef(null)
  const partColRef = useRef(null)

  useEffect(() => {
    const m = meColRef.current
    const p = partColRef.current
    if (m) m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' })
    if (p) p.scrollTo({ top: p.scrollHeight, behavior: 'smooth' })
  }, [segments])

  if (!visible) return null

  const meLines = segments.filter((s) => s.speaker === 'me')
  const otherLines = segments.filter((s) => s.speaker === 'other')

  return (
    <div
      className={[
        'grid shrink-0 grid-cols-2 gap-px border-b border-white/[0.08] bg-white/[0.06]',
        className,
      ].join(' ')}
    >
      <div
        ref={meColRef}
        className="flex max-h-[9.5rem] min-h-[4rem] flex-col gap-1 overflow-y-auto bg-sky-950/25 px-2 py-2"
      >
        <div className="sticky top-0 z-[1] bg-sky-950/80 pb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90">
          Me
        </div>
        {meLines.map((s) => (
          <p
            key={s.id}
            className="break-words rounded-md bg-sky-500/10 px-2 py-1 text-[11px] leading-snug text-zinc-100"
            style={{ animation: 'overlayLiveLine 220ms ease-out' }}
          >
            {s.text}
          </p>
        ))}
      </div>
      <div
        ref={partColRef}
        className="flex max-h-[9.5rem] min-h-[4rem] flex-col gap-1 overflow-y-auto bg-zinc-900/40 px-2 py-2"
      >
        <div className="sticky top-0 z-[1] bg-zinc-900/85 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Participant
        </div>
        {otherLines.map((s) => (
          <p
            key={s.id}
            className="break-words rounded-md bg-zinc-800/70 px-2 py-1 text-[11px] leading-snug text-zinc-200"
            style={{ animation: 'overlayLiveLine 220ms ease-out' }}
          >
            {s.text}
          </p>
        ))}
      </div>
      <style>{`
        @keyframes overlayLiveLine {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
