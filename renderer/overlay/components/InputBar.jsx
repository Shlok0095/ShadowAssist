// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useRef, memo, forwardRef, useImperativeHandle } from 'react'
import { Send } from 'lucide-react'
import AppIcon from '../../shared/AppIcon'

function InputBarInner({ onAsk, onAbort, isThinking, sessionOn = false, focusMode = false }, ref) {
  const [value, setValue] = useState('')
  const textRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus() {
      textRef.current?.focus()
    },
  }))

  const placeholder = sessionOn
    ? 'Ask or /skill-name… Ctrl+↵ screen · Ctrl+⇧+↵ audio only'
    : 'Turn on Listen to ask…'

  const submitText = () => {
    if (!sessionOn) return
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
        aria-label="Ask a question"
        rows={1}
        disabled={!sessionOn}
        className={[
          'crystal-input flex-1 min-h-[34px] max-h-[72px] resize-none rounded-xl px-3 py-2',
          'text-[12.5px] transition-colors duration-150',
          'disabled:opacity-45 disabled:cursor-not-allowed',
        ].join(' ')}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      />
      {isThinking && !value.trim() ? (
        <button
          type="button"
          onClick={() => onAbort?.()}
          aria-label="Stop generating"
          className="cursor-default flex h-[34px] shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 text-[11px] font-medium text-rose-200 transition-colors duration-150 hover:bg-rose-500/20 hover:border-rose-400/50 active:scale-95 active:bg-rose-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300/60 focus-visible:outline-offset-1"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={submitText}
          disabled={!sessionOn || (isThinking && !value.trim())}
          aria-label="Send"
          className={[
            'crystal-send-btn cursor-default flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition duration-150 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            isThinking && !value.trim() ? 'opacity-50' : '',
          ].join(' ')}
        >
          <AppIcon icon={Send} size={16} strokeWidth={2.25} className="text-white" />
        </button>
      )}
    </div>
  )
}

const InputBar = memo(forwardRef(InputBarInner))
export default InputBar
