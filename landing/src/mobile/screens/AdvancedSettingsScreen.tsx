import { useState } from 'react'
import type { AppSettings } from '../profileTypes'
import { ScreenHeader } from '../components/MobileUi'
import { AiProvidersSection } from './settings/AiProvidersSection'
import { AudioSettingsSection } from './settings/AudioSettingsSection'
import { Segmented, SettingsIcons } from './settings/SettingsPrimitives'
import { MEMORY_OPTIONS } from '../settingsCatalog'

export function AdvancedSettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onBack: () => void
}) {
  const [memoryInfoOpen, setMemoryInfoOpen] = useState(false)

  return (
    <div className="mobile-screen">
      <ScreenHeader title="Advanced Settings" onBack={onBack} />

      <div className="mobile-screen-body">
        <AiProvidersSection settings={settings} onChange={onChange} />
        <AudioSettingsSection settings={settings} onChange={onChange} />

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">AI performance</p>
          <div className="mobile-settings-card">
            <div className="mobile-field">
              <span className="mobile-field-label-row">
                Conversation Memory
                <button
                  type="button"
                  className="mobile-info-btn"
                  aria-label="About Conversation Memory"
                  onClick={() => setMemoryInfoOpen(true)}
                >
                  {SettingsIcons.info}
                </button>
              </span>
              <Segmented
                value={String(settings.conversationMemorySec)}
                options={MEMORY_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                onChange={(v) =>
                  onChange({ conversationMemorySec: Number(v) as AppSettings['conversationMemorySec'] })
                }
              />
              <span className="mobile-settings-row-hint">Longer memory may slow responses</span>
            </div>
          </div>
        </section>
      </div>

      {memoryInfoOpen ? (
        <div className="mobile-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="memory-info-title">
          <button
            type="button"
            className="mobile-leave-backdrop"
            aria-label="Close"
            onClick={() => setMemoryInfoOpen(false)}
          />
          <div className="mobile-leave-sheet">
            <h2 id="memory-info-title" className="mobile-leave-title">
              Conversation Memory
            </h2>
            <p className="mobile-leave-copy">
              How much of the conversation the AI remembers. Longer = better context but slower.
            </p>
            <button type="button" className="mobile-leave-stay" onClick={() => setMemoryInfoOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
