// Copyright (c) 2026 VeilAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { memo } from 'react'
import logoSrc from '../../../logo.png'

function StudioMicIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 24 28" fill="none" aria-hidden>
      <rect x="8.5" y="1.5" width="7" height="12.5" rx="3.5" fill="#ef4444" />
      <line x1="10" y1="4.5" x2="14" y2="4.5" stroke="#fecaca" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="10" y1="6.8" x2="14" y2="6.8" stroke="#fecaca" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="10" y1="9.1" x2="14" y2="9.1" stroke="#fecaca" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="10" y1="11.4" x2="14" y2="11.4" stroke="#fecaca" strokeWidth="0.9" strokeLinecap="round" />
      <path
        d="M6.5 14.5C6.5 17.5 8.8 19.8 12 19.8C15.2 19.8 17.5 17.5 17.5 14.5"
        stroke="#ef4444"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line x1="12" y1="19.8" x2="12" y2="23.5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.5" y1="25.5" x2="16.5" y2="25.5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function StopSquareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="1.5" fill="#ef4444" />
    </svg>
  )
}

function StatusBar({ sessionOn, ocrStatus, onToggleSession, onOpenSettings, onQuit }) {
  const ocrHint =
    ocrStatus === 'loading'
      ? 'Loading screen OCR…'
      : ocrStatus === 'error'
        ? 'Screen OCR failed'
        : null

  return (
    <div className="crystal-status-row crystal-notch-bar relative flex h-10 items-center justify-between gap-2 pl-2 pr-2.5 select-none">
      <div className="flex shrink-0 items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <img
          src={logoSrc}
          alt="VeilAssist"
          className="crystal-notch-logo"
          draggable={false}
        />
        {ocrHint && (
          <span
            className={`crystal-sublabel text-[10px] font-medium normal-case ${
              ocrStatus === 'error' ? 'text-red-400' : 'text-white/55'
            }`}
            title={ocrStatus === 'error' ? 'Restart app or reinstall if screen reading stays broken' : 'First launch loads ONNX models (10–30s)'}
          >
            {ocrHint}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSession()
          }}
          title={sessionOn ? 'Stop listening' : 'Start listening'}
          aria-label={sessionOn ? 'Stop listening' : 'Start listening'}
          className="crystal-session-btn cursor-default flex h-8 w-8 shrink-0 items-center justify-center transition-opacity duration-150 hover:opacity-80 active:scale-95"
        >
          {sessionOn ? <StopSquareIcon /> : <StudioMicIcon />}
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onOpenSettings()
          }}
          title="Settings"
          className="crystal-icon-btn cursor-default flex h-7 w-7 shrink-0 items-center justify-center rounded-lg active:scale-95"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuit?.()
          }}
          title="Quit VeilAssist — fully exit"
          className="crystal-quit-btn cursor-default flex h-7 shrink-0 items-center justify-center rounded-lg px-2.5 text-[10px] font-semibold transition-all duration-150 active:scale-95"
        >
          Quit
        </button>
      </div>
    </div>
  )
}

export default memo(StatusBar)
