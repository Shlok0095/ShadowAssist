// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 3 — quick preset asks (no new capture paths).

import React, { memo } from 'react'
import { ACTION_CHIP_PRESETS } from '../actionChipPresets'

function ActionChips({ onChip, disabled = false, sessionOn = false }) {
  if (!sessionOn) return null

  return (
    <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/[0.06] bg-black/20 px-3 py-2">
      {ACTION_CHIP_PRESETS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-label={chip.label}
          disabled={disabled}
          onClick={() => onChip?.(chip)}
          className={[
            'rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1',
            'text-[10.5px] font-medium text-zinc-300 transition-colors',
            'hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

export default memo(ActionChips)
