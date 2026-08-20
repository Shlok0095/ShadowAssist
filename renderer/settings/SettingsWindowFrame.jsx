// Copyright (c) 2026 VeilAssist. All rights reserved.
// Settings window — Natively-style black professional chrome (overlay unchanged).

import React, { useCallback, useState } from 'react'
import overlayBrandLogo from '../shared/overlayBrandLogo'

const drag = { WebkitAppRegion: 'drag' }
const noDrag = { WebkitAppRegion: 'no-drag' }

function TitleBarButton({ onClick, title, children, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={noDrag}
      className={`flex h-9 w-11 shrink-0 items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 ${
        danger ? 'hover:bg-red-600 hover:text-white' : ''
      }`}
    >
      {children}
    </button>
  )
}

export default function SettingsWindowFrame({ children }) {
  const api = typeof window !== 'undefined' ? window.shadowAPI : null
  const [maximized, setMaximized] = useState(false)

  const minimize = useCallback(() => {
    void api?.invoke('window:minimize')
  }, [api])

  const toggleMax = useCallback(async () => {
    await api?.invoke('window:maximize-toggle')
    setMaximized((m) => !m)
  }, [api])

  const close = useCallback(() => {
    void api?.invoke('window:close')
  }, [api])

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#09090b] shadow-2xl"
      style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)' }}
    >
      <header
        className="flex h-9 shrink-0 items-center border-b border-white/[0.08] bg-[#111113]"
        style={drag}
      >
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 px-3" style={drag}>
          <img
            src={overlayBrandLogo}
            alt="VeilAssist"
            width={18}
            height={18}
            draggable={false}
            className="pointer-events-none h-[18px] w-[18px] shrink-0 object-contain"
          />
          <span className="truncate text-[11px] font-medium text-zinc-400">VeilAssist</span>
        </div>

        <div className="flex shrink-0 items-stretch" style={noDrag}>
          <TitleBarButton title="Minimize" onClick={minimize}>
            <svg className="h-2.5 w-2.5" viewBox="0 0 12 2" fill="currentColor">
              <rect width="10" height="1.25" x="1" y="0.4" rx="0.25" />
            </svg>
          </TitleBarButton>
          <TitleBarButton title={maximized ? 'Restore' : 'Maximize'} onClick={toggleMax}>
            {maximized ? (
              <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="2.5" y="3.5" width="6" height="6" rx="0.5" />
              </svg>
            ) : (
              <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="1.5" y="1.5" width="9" height="9" rx="0.5" />
              </svg>
            )}
          </TitleBarButton>
          <TitleBarButton title="Close" onClick={close} danger>
            <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.35">
              <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
            </svg>
          </TitleBarButton>
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
