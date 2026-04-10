// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useRef, memo } from 'react'

function WaveBars({ active }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active || !ref.current) return
    let frame
    const bars = Array.from(ref.current.children)
    const animate = () => {
      bars.forEach((bar, i) => {
        bar.style.height = active ? `${3 + Math.abs(Math.sin(Date.now() / 160 + i * 1.1)) * 7}px` : '3px'
      })
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [active])
  return (
    <div ref={ref} className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full bg-accent/70"
          style={{ height: 3 }}
        />
      ))}
    </div>
  )
}

function StatusBar({ status, sessionOn, expanded, onToggleSession, onOpenSettings, onExpand, onHide }) {
  const [micActive, setMicActive] = useState(false)
  const [lastHeard, setLastHeard] = useState('')
  const [micError, setMicError] = useState('')
  const downPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMic = (e) => {
      setMicActive(e.detail.active)
      if (!e.detail.active) {
        setLastHeard('')
        setMicError('')
      }
    }
    const onTranscript = (e) => setLastHeard(e.detail?.latest || '')
    const onErr = (e) => {
      setMicError(e.detail?.message)
      setMicActive(false)
    }
    window.addEventListener('mic-status', onMic)
    window.addEventListener('transcript-updated', onTranscript)
    window.addEventListener('mic-error', onErr)
    return () => {
      window.removeEventListener('mic-status', onMic)
      window.removeEventListener('transcript-updated', onTranscript)
      window.removeEventListener('mic-error', onErr)
    }
  }, [])

  const isThinking = status === 'thinking'

  const onMouseDown = (e) => {
    downPos.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseUp = (e) => {
    if (
      Math.abs(e.clientX - downPos.current.x) < 6 &&
      Math.abs(e.clientY - downPos.current.y) < 6 &&
      !expanded
    ) {
      onExpand()
    }
  }

  return (
    <div className="relative z-10 flex-shrink-0">
      <div
        className="relative flex h-10 items-center justify-between gap-2 border-b border-white/[0.07] px-3 select-none"
        style={{ WebkitAppRegion: 'drag', cursor: expanded ? 'move' : 'pointer' }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {/* Brand */}
        <div
          className="flex shrink-0 items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <span
            className="relative h-[7px] w-[7px] rounded-full transition-all duration-300"
            style={{
              background: isThinking
                ? '#f59e0b'
                : sessionOn
                  ? 'rgb(var(--accent-rgb))'
                  : '#3f3f46',
              boxShadow: isThinking
                ? '0 0 7px rgba(245,158,11,0.55)'
                : sessionOn
                  ? '0 0 7px rgb(var(--accent-rgb)/0.5)'
                  : 'none',
            }}
          />
          <span className="text-[11px] font-semibold tracking-[0.08em] text-white/60">
            Shadow
          </span>
        </div>

        {/* Live status */}
        <div
          className="min-w-0 flex-1 px-2"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {isThinking ? (
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 animate-pulse rounded-full bg-amber-400" />
              <span className="text-[11px] text-amber-300/90">Thinking…</span>
            </div>
          ) : sessionOn ? (
            <div className="flex items-center gap-1.5">
              <WaveBars active={micActive} />
              <span className="min-w-0 flex-1 truncate text-[11px] text-accent-light/85">
                {lastHeard ? lastHeard.slice(-52) : 'Listening…'}
              </span>
            </div>
          ) : micError ? (
            <span className="truncate text-[11px] text-rose-400/90">{micError.slice(0, 36)}</span>
          ) : (
            <span className="text-[11px] text-zinc-600">Ready</span>
          )}
        </div>

        {/* Controls */}
        <div
          className="flex shrink-0 items-center gap-0.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSession() }}
            className={[
              'cursor-default flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all duration-150 active:scale-95',
              sessionOn
                ? 'animate-listen-ring border-accent/35 bg-accent/12 text-accent-light hover:bg-accent/20'
                : 'border-white/[0.09] bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
            ].join(' ')}
          >
            {sessionOn ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            )}
            {sessionOn ? 'Stop' : 'Listen'}
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenSettings() }}
            title="Settings"
            className="cursor-default flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-all duration-150 hover:bg-white/[0.06] hover:text-zinc-300 active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {!expanded && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onExpand() }}
              title="Expand"
              className="cursor-default flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-all duration-150 hover:bg-white/[0.06] hover:text-zinc-300 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onHide() }}
            title="Hide"
            className="cursor-default flex h-7 w-7 items-center justify-center rounded-lg text-zinc-700 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(StatusBar)
