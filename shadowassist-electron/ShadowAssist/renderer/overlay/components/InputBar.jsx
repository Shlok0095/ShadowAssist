// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useRef, memo } from 'react'

/** Paper-plane send glyph — shape from reference; drawn in white on the red button. */
function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="#ffffff" d="M21 12 3 7.25 3 12Z" />
      <path fill="#ffffff" d="M21 12 3 12 3 16.75Z" />
      <path d="M3 12h18" stroke="rgba(127, 29, 29, 0.42)" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  )
}

function InputBar({ onAsk, onAbort, isThinking, sessionOn = false, focusMode = false }) {
  const [value, setValue] = useState('')
  const textRef = useRef(null)

  const placeholder = sessionOn
    ? 'Ask about the meeting… or Enter to read screen'
    : 'Type a question… or Enter to read screen · Ctrl+Enter anytime'

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
    if (e.key === 'Escape' && focusMode) {
      setValue('')
      textRef.current?.blur()
    }
  }

  return (
    <div className="flex shrink-0 items-end gap-2 px-3 py-2.5">
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={[
          'crystal-input flex-1 min-h-[34px] max-h-[72px] resize-none rounded-xl px-3 py-2',
          'text-[12.5px] transition-colors duration-150',
        ].join(' ')}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      />
      {isThinking && !value.trim() ? (
        <button
          type="button"
          onClick={() => onAbort?.()}
          title="Stop generating"
          className="cursor-default flex h-[34px] shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={submitText}
          disabled={isThinking && !value.trim()}
          title="Send"
          aria-label="Send"
          className={[
            'crystal-send-btn cursor-default flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95',
            isThinking && !value.trim() ? 'opacity-50' : '',
          ].join(' ')}
        >
          <SendIcon />
        </button>
      )}
    </div>
  )
}

export default memo(InputBar)
