// Copyright (c) 2026 VeilAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { memo } from 'react'
import { Settings } from 'lucide-react'
import AppIcon from '../../shared/AppIcon'
import overlayBrandLogo from '../../shared/overlayBrandLogo'

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
          src={overlayBrandLogo}
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

      <div className="flex shrink-0 items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          role="switch"
          aria-checked={sessionOn}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSession()
          }}
          title={sessionOn ? 'Listening on — tap to stop' : 'Listening off — tap to start'}
          aria-label={sessionOn ? 'Listening on' : 'Listening off'}
          className="crystal-listen-switch cursor-default shrink-0"
        >
          <span className="crystal-listen-switch-knob" aria-hidden>
            {sessionOn ? (
              <span className="crystal-listen-switch-stop" />
            ) : (
              <span className="crystal-listen-switch-play" />
            )}
          </span>
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
          <AppIcon icon={Settings} size={14} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuit?.()
          }}
          title={`Quit ${name} — fully exit`}
          className="crystal-quit-btn cursor-default flex h-7 shrink-0 items-center justify-center rounded-lg px-2.5 text-[10px] font-semibold transition-all duration-150 active:scale-95"
        >
          Quit
        </button>
      </div>
    </div>
  )
}

export default memo(StatusBar)
