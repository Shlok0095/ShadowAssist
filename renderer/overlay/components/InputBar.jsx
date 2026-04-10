// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useRef, memo } from 'react'

function InputBar({ onAsk, isThinking }) {
  const [value, setValue] = useState('')
  const textRef = useRef(null)

  const submitText = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onAsk(trimmed, { source: 'typed', bypassCaptureCooldown: true })
      setValue('')
    } else {
      onAsk(null, { source: 'screen-read', bypassCaptureCooldown: true })
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitText()
    }
  }

  return (
    <div className="flex shrink-0 items-end gap-2 px-3 py-2.5">
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything… or press Enter to read screen"
        rows={1}
        className={[
          'flex-1 min-h-[34px] max-h-[72px] resize-none rounded-xl px-3 py-2',
          'bg-white/[0.05] border border-white/[0.09] text-[12.5px] text-gray-200',
          'placeholder-zinc-600 focus:outline-none focus:border-accent/30 focus:bg-white/[0.07]',
          'transition-colors duration-150',
        ].join(' ')}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      />
      <button
        type="button"
        onClick={submitText}
        disabled={isThinking && !value.trim()}
        className={[
          'cursor-default flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl transition-all duration-150 active:scale-95',
          isThinking && !value.trim()
            ? 'bg-amber-500/10 text-amber-400/70'
            : 'border border-accent/25 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent/40',
        ].join(' ')}
      >
        {isThinking && !value.trim() ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default memo(InputBar)
