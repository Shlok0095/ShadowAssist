import { useEffect, useState } from 'react'

export function ModelSelect({
  value,
  options,
  placeholder,
  onChange,
  onSync,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (model: string) => void
  onSync?: () => Promise<{ models: string[]; error?: string }>
}) {
  const [list, setList] = useState<string[]>(options)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)

  useEffect(() => {
    setList(options)
  }, [options])

  const merged = [...new Set([value, ...list].filter(Boolean))]

  const runSync = async () => {
    if (!onSync) return
    setSyncing(true)
    setSyncNote(null)
    try {
      const result = await onSync()
      if (result.models.length) setList(result.models)
      setSyncNote(result.error || 'Models synced')
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mobile-model-select-wrap">
      <div className="mobile-model-select-row">
        <select
          className="mobile-select mobile-model-select"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {!value ? <option value="">{placeholder}</option> : null}
          {merged.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
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
