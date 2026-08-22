import { useEffect, useState } from 'react'
import { SheetSelect } from './SheetSelect'

export type ModelOption = { value: string; label: string }

function asOptions(options: Array<string | ModelOption>): ModelOption[] {
  return options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt))
}

export function ModelSelect({
  value,
  options,
  placeholder,
  onChange,
  onSync,
}: {
  value: string
  options: Array<string | ModelOption>
  placeholder: string
  onChange: (model: string) => void
  onSync?: () => Promise<{ models: string[]; source?: 'api' | 'static'; error?: string }>
}) {
  const labeled = asOptions(options)
  const [list, setList] = useState<ModelOption[]>(labeled)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)

  useEffect(() => {
    setList(asOptions(options))
  }, [options])

  const merged = [...list]
  if (value && !merged.some((m) => m.value === value)) {
    merged.unshift({ value, label: value })
  }
  const sheetOptions = merged.length
    ? merged
    : [{ value: placeholder, label: placeholder }]

  const runSync = async () => {
    if (!onSync) return
    setSyncing(true)
    setSyncNote(null)
    try {
      const result = await onSync()
      if (result.models.length) setList(result.models.map((m) => ({ value: m, label: m })))
      if (result.error) setSyncNote(result.error)
      else if (result.source === 'api') setSyncNote('Models synced from API')
      else setSyncNote('Using built-in model list')
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mobile-model-select-wrap">
      <div className="mobile-model-select-row">
        <SheetSelect
          value={value || placeholder}
          options={sheetOptions}
          title="Model"
          subtitle="Ranked for camera. Failures try the next model automatically."
          onChange={onChange}
        />
        {onSync ? (
          <button
            type="button"
            className="mobile-sync-btn"
            disabled={syncing}
            aria-label="Sync models"
            onClick={() => void runSync()}
          >
            {syncing ? '…' : '↻'}
          </button>
        ) : null}
      </div>
      {syncNote ? <p className="mobile-sync-note">{syncNote}</p> : null}
    </div>
  )
}
