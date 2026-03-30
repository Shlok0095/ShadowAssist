// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useRef } from 'react'

export default function InputBar({ onAsk, isThinking }) {
  const [value, setValue] = useState('')
  const textRef = useRef(null)

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onAsk(trimmed)
      setValue('')
    } else {
      onAsk(null)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-shrink-0 items-end gap-2 border-t border-white/[0.08] bg-gradient-to-t from-black/35 to-transparent px-3 py-2.5">
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything… or Ctrl+Enter to read screen"
        rows={1}
        className="flex-1 min-h-[36px] max-h-[80px] px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 resize-none transition-colors"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      />
      <button
        onClick={submit}
        disabled={isThinking && !value.trim()}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
          isThinking && !value.trim()
            ? 'cursor-wait bg-amber-500/20 text-amber-400'
            : 'cursor-default border border-accent/30 bg-accent/20 text-accent hover:bg-accent/30'
        }`}
      >
        {isThinking && !value.trim() ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  )
}
