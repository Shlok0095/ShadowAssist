import { useState } from 'react'
import type { AppSettings } from '../../profileTypes'
import { CHAT_PROVIDER_ORDER, CHAT_PROVIDERS, providerKeyConfigured } from '../../providerRegistry'

export function AiProvidersSection({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">AI PROVIDERS</p>
      <p className="mobile-section-hint mobile-settings-intro">
        Bring your own API keys — same vendors as the desktop app. Keys stay on your device.
      </p>

      <div className="mobile-settings-card">
        <label className="mobile-field">
          <span>Active chat provider</span>
          <select
            value={settings.provider}
            onChange={(e) => onChange({ provider: e.target.value as AppSettings['provider'] })}
          >
            {CHAT_PROVIDER_ORDER.map((id) => {
              const meta = CHAT_PROVIDERS.find((p) => p.id === id)!
              return (
                <option key={id} value={id}>
                  {meta.label}
                  {providerKeyConfigured(settings, id) ? ' ✓' : ''}
                </option>
              )
            })}
          </select>
          <span className="mobile-field-hint">Used for interview answer generation.</span>
        </label>
      </div>

      <div className="mobile-vendor-list">
        {CHAT_PROVIDERS.map((meta) => {
          const isActive = settings.provider === meta.id
          const isOpen = expanded[meta.id] ?? isActive
          const keyValue = String(settings[meta.keyField] || '')
          const modelValue = String(settings[meta.modelField] || '')
          const keySaved = providerKeyConfigured(settings, meta.id)

          return (
            <div
              key={meta.id}
              className={`mobile-vendor-card ${isActive ? 'active' : ''}`}
            >
              <button
                type="button"
                className="mobile-vendor-card-head"
                onClick={() => toggleExpanded(meta.id)}
              >
                <div className="mobile-vendor-card-title">
                  <span className="mobile-vendor-badge">{meta.badge}</span>
                  <strong>{meta.label}</strong>
                  {isActive ? <span className="mobile-vendor-active-tag">Active</span> : null}
                  {keySaved ? <span className="mobile-vendor-saved">Key saved</span> : null}
                </div>
                <span className="mobile-vendor-chevron">{isOpen ? '⌃' : '⌄'}</span>
              </button>

              {isOpen ? (
                <div className="mobile-vendor-card-body">
                  <p className="mobile-vendor-desc">{meta.desc}</p>
                  {meta.docs ? (
                    <a className="mobile-vendor-docs" href={meta.docs} target="_blank" rel="noreferrer">
                      Get API key ↗
                    </a>
                  ) : null}

                  {meta.kind === 'anthropic' ? (
                    <p className="mobile-vendor-note">
                      Claude uses the Anthropic Messages API — not OpenAI-compatible.
                    </p>
                  ) : null}

                  {meta.baseUrlField ? (
                    <label className="mobile-field">
                      <span>Base URL</span>
                      <input
                        value={String(settings[meta.baseUrlField] || '')}
                        onChange={(e) =>
                          onChange({ [meta.baseUrlField!]: e.target.value } as Partial<AppSettings>)
                        }
                        placeholder="https://your-server.com/v1"
                      />
                    </label>
                  ) : null}

                  <label className="mobile-field">
                    <span>API key</span>
                    <input
                      type="password"
                      value={keyValue}
                      onChange={(e) =>
                        onChange({ [meta.keyField]: e.target.value } as Partial<AppSettings>)
                      }
                      placeholder={keySaved ? '••••••••' : 'Paste API key'}
                    />
                  </label>

                  <label className="mobile-field">
                    <span>Model</span>
                    <input
                      value={modelValue}
                      onChange={(e) =>
                        onChange({ [meta.modelField]: e.target.value } as Partial<AppSettings>)
                      }
                      placeholder={meta.defaultModel}
                    />
                  </label>

                  {!isActive ? (
                    <button
                      type="button"
                      className="mobile-vendor-use-btn"
                      onClick={() => onChange({ provider: meta.id })}
                    >
                      Use {meta.label} for answers
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
