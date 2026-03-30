// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useRef } from 'react'

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
    <div ref={ref} className="flex h-3.5 items-end gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-accent to-accent-light/90 transition-all duration-150"
          style={{ height: 3 }}
        />
      ))}
    </div>
  )
}

export default function StatusBar({ status, sessionOn, expanded, onToggleSession, onOpenSettings, onExpand, onHide }) {
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

  const pillBase =
    'flex h-7 max-w-full items-center gap-2 overflow-hidden rounded-full border px-3 transition-all duration-200 ease-out'

  return (
    <div className="relative z-10 flex-shrink-0">
      {/* Soft top accent — slides with bar feel */}
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-accent-mid/35 to-transparent animate-bar-shine"
        aria-hidden
      />

      {/* Collapsed: “pull tab” hint */}
      {!expanded && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[3px]"
          aria-hidden
        >
          <div className="h-[3px] w-11 rounded-full bg-gradient-to-r from-white/[0.06] via-white/25 to-white/[0.06] shadow-[0_0_14px_rgb(var(--accent-rgb)/0.2)]" />
        </div>
      )}

      <div
        className="relative flex h-9 items-center justify-between gap-2 rounded-t-[13px] border-b border-white/[0.06] bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent px-3 backdrop-blur-md select-none"
        style={{ WebkitAppRegion: 'drag', cursor: expanded ? 'move' : 'default' }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {/* Brand */}
        <div className="flex cursor-default flex-shrink-0 items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <span
              className={`absolute inset-0 rounded-full opacity-60 blur-[6px] ${isThinking ? '' : sessionOn ? 'bg-accent' : 'bg-gray-600'}`}
              style={isThinking ? { background: '#f59e0b' } : undefined}
            />
            <span
              className={`relative h-2 w-2 rounded-full ring-2 ring-white/10 ${!isThinking && sessionOn ? 'bg-accent' : !isThinking && !sessionOn ? 'bg-gray-500' : ''}`}
              style={
                isThinking
                  ? { background: '#fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.45)' }
                  : sessionOn
                    ? { boxShadow: '0 0 10px rgb(var(--accent-rgb) / 0.55)' }
                    : undefined
              }
            />
          </div>
          <span className="bg-gradient-to-br from-white/90 via-white/70 to-white/40 bg-clip-text text-[10px] font-bold uppercase tracking-[0.14em] text-transparent">
            Shadow
          </span>
        </div>

        {/* Status / transcript */}
        <div className="min-w-0 flex-1 cursor-default px-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
          {isThinking ? (
            <div
              className={`${pillBase} justify-center border-amber-400/20 bg-gradient-to-r from-amber-500/12 to-amber-600/8`}
            >
              <span className="text-[10px] font-medium tracking-wide text-amber-200/95">Thinking…</span>
            </div>
          ) : sessionOn ? (
            <div
              className={`${pillBase} border-accent-mid/25 bg-gradient-to-r from-accent/10 via-accent-mid/5 to-transparent`}
            >
              <WaveBars active={micActive} />
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium tracking-wide text-accent-light/95">
                {lastHeard ? lastHeard.slice(-56) : 'Listening…'}
              </span>
            </div>
          ) : micError ? (
            <div className={`${pillBase} border-rose-400/25 bg-rose-500/10`}>
              <span className="truncate text-[10px] text-rose-300">{micError.slice(0, 34)}</span>
            </div>
          ) : (
            <div className={`${pillBase} border-white/[0.06] bg-white/[0.03]`}>
              <span className="text-[10px] font-medium tracking-wide text-gray-500">Ready</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSession()
            }}
            className={[
              'cursor-default flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ease-spring',
              'active:scale-[0.96]',
              sessionOn
                ? 'animate-listen-ring border-accent-mid/40 bg-gradient-to-b from-accent/25 to-accent-mid/15 text-white shadow-[0_0_16px_-4px_rgb(var(--accent-rgb)/0.45)] hover:border-accent-light/55'
                : 'border-white/10 bg-white/[0.06] text-gray-300 hover:border-white/20 hover:bg-white/[0.1] hover:text-white',
            ].join(' ')}
          >
            {sessionOn ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-95">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.2" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            )}
            {sessionOn ? 'Stop' : 'Listen'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSettings()
            }}
            className="flex h-8 w-8 cursor-default items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-white/[0.07] hover:text-sky-300 active:scale-95"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {!expanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              className="group flex h-8 w-8 cursor-default items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-white/[0.07] hover:text-accent-light active:scale-95"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 ease-out-expo group-hover:translate-y-px"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onHide()
            }}
            className="flex h-8 w-8 cursor-default items-center justify-center rounded-xl text-gray-500 transition-all duration-200 hover:bg-rose-500/15 hover:text-rose-300 active:scale-95"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
