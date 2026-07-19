// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 6 — search past meeting recaps from the overlay (vector + keyword).

import React, { memo, useCallback, useState } from 'react'
import { Search } from 'lucide-react'
import { createIpcShim } from '../../shared/ipcShim'
import AppIcon from '../../shared/AppIcon'

const ipc = createIpcShim()

function formatWhen(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function PastMeetingSearch({ onAskWithContext, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [busy, setBusy] = useState(false)

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (!q || !ipc) return
    setBusy(true)
    try {
      const r = await ipc.invoke('memory:search-past-meetings', q)
      setHits(Array.isArray(r?.hits) ? r.hits : [])
    } finally {
      setBusy(false)
    }
  }, [query])

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-black/15 px-3 py-1.5 text-[10.5px] text-zinc-400 hover:text-zinc-200"
      >
        <AppIcon icon={Search} size={12} strokeWidth={2} />
        Search past meetings
      </button>
    )
  }

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-black/25 px-3 py-2">
      <div className="flex items-center gap-2">
        <AppIcon icon={Search} size={13} className="shrink-0 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch()
            if (e.key === 'Escape') {
              setOpen(false)
              setHits([])
            }
          }}
          placeholder="Search saved sessions…"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <button type="button" disabled={busy || !query.trim()} onClick={() => void runSearch()} className="text-[10px] text-accent">
          {busy ? '…' : 'Go'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setHits([]) }} className="text-[10px] text-zinc-600 hover:text-zinc-400">
          ×
        </button>
      </div>
      {hits.length > 0 ? (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
          {hits.map((h, i) => (
            <li key={`${h.sessionId || i}-${i}`}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]"
                onClick={() => {
                  onAskWithContext?.(h)
                  setOpen(false)
                  setHits([])
                  setQuery('')
                }}
              >
                <div className="truncate text-[10.5px] text-zinc-300">{h.text}</div>
                <div className="mt-0.5 text-[9px] text-zinc-600">
                  {h.modeName || 'Session'}
                  {h.startedAt ? ` · ${formatWhen(h.startedAt)}` : ''}
                  {h.source ? ` · ${h.source}` : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() && !busy ? (
        <p className="mt-2 text-[10px] text-zinc-600">No matches in saved sessions.</p>
      ) : null}
    </div>
  )
}

export default memo(PastMeetingSearch)
