import type { AppSettings } from '../../profileTypes'
import { CHAT_MODEL_CATALOG } from '../../modelCatalog'
import { CHAT_PROVIDER_ORDER, CHAT_PROVIDERS, providerKeyConfigured } from '../../providerRegistry'
import { loadAppSettings } from '../../profileStorage'
import { syncChatModels } from '../../modelSync'
import { ModelSelect } from './ModelSelect'
import { PremiumSelect } from './PremiumSelect'

export function AiProvidersSection({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const meta = CHAT_PROVIDERS.find((p) => p.id === settings.provider)!
  const keyValue = String(settings[meta.keyField] || '')
  const modelValue = String(settings[meta.modelField] || '')
  const keySaved = providerKeyConfigured(settings, meta.id)

  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">AI PROVIDERS</p>
      <p className="mobile-section-hint mobile-settings-intro">
        Chat models for interview answers. Keys stay on your device.
      </p>

      <div className="mobile-settings-card mobile-provider-card">
        <PremiumSelect
          label="Active chat provider"
          value={settings.provider}
          onChange={(e) => onChange({ provider: e.target.value as AppSettings['provider'] })}
        >
          {CHAT_PROVIDER_ORDER.map((id) => {
            const p = CHAT_PROVIDERS.find((x) => x.id === id)!
            return (
              <option key={id} value={id}>
                {p.badge} · {p.label}
                {providerKeyConfigured(settings, id) ? ' ✓' : ''}
              </option>
            )
          })}
        </PremiumSelect>

        <div className="mobile-provider-detail">
          <div className="mobile-provider-detail-head">
            <span className="mobile-vendor-badge">{meta.badge}</span>
            <strong>{meta.label}</strong>
            {keySaved ? <span className="mobile-vendor-saved">Key saved</span> : null}
          </div>
          <p className="mobile-vendor-desc">{meta.desc}</p>
          {meta.docs ? (
            <a className="mobile-vendor-docs" href={meta.docs} target="_blank" rel="noreferrer">
              Get API key ↗
            </a>
          ) : null}

          {meta.kind === 'anthropic' ? (
            <p className="mobile-vendor-note">
              Claude uses Anthropic Messages API — not OpenAI-compatible.
            </p>
          ) : null}

          {meta.baseUrlField ? (
            <label className="mobile-field">
              <span>Base URL</span>
              <input
                className="mobile-input"
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
              className="mobile-input"
              type="password"
              value={keyValue}
              onChange={(e) => onChange({ [meta.keyField]: e.target.value } as Partial<AppSettings>)}
              placeholder={keySaved ? '••••••••' : 'Paste API key'}
            />
          </label>

          <label className="mobile-field">
            <span>Model</span>
            <ModelSelect
              value={modelValue}
              options={CHAT_MODEL_CATALOG[meta.id] || [meta.defaultModel]}
              placeholder={meta.defaultModel}
              onChange={(m) => onChange({ [meta.modelField]: m } as Partial<AppSettings>)}
              onSync={() => syncChatModels(meta.id, loadAppSettings())}
            />
          </label>
        </div>
      </div>
    </section>
  )
}
