// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import {
  ModelInput,
  ModelSelect,
  SettingsBadge,
  SettingsFieldLabel,
  SettingsPanelShell,
  SettingsSection,
} from './SettingsComponents'
import { useBrand } from '../shared/branding'

export default function AiProviderPanel({
  embedded = false,
  snap,
  providerMeta,
  provider,
  onSelectProvider,
  keySetMap,
  secretByProvider,
  setSecretByProvider,
  onSaveKey,
  chatVendor,
  chatKf,
  chatKeySaved,
  chatMf,
  chatModel,
  onPatchSnap,
  onSave,
  chatOpts,
  onSyncModels,
  chatListLoading,
  chatListErr,
  modelCatalog,
  chatTest,
  chatTesting,
  onTestConnection,
  showSetupBanner,
  onLaunchFromSetup,
}) {
  const { name } = useBrand()
  return (
    <SettingsPanelShell
      embedded={embedded}
      title="AI Providers"
      description="Configure chat models and API keys. Speech transcription is under Audio."
    >
      <SettingsSection title="Chat provider" description="Bring your own API key — answers never route through our servers.">
        {!snap || !providerMeta.length ? (
          <p className="text-sm text-gray-500">Loading providers…</p>
        ) : (
          <>
            <div>
              <SettingsFieldLabel>Provider</SettingsFieldLabel>
              <select
                value={provider}
                onChange={(e) => onSelectProvider(e.target.value)}
                className="input-shadow w-full px-3 py-2.5 font-mono text-sm"
              >
                {providerMeta.map((pm) => (
                  <option key={pm.id} value={pm.id} className="bg-void-900">
                    {pm.label}
                    {pm.keyField && keySetMap[pm.keyField] ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {chatVendor && snap && (
              <div className="nat-provider-card space-y-4 rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white">{chatVendor.label}</span>
                    {chatKeySaved ? <SettingsBadge>Key saved</SettingsBadge> : null}
                  </div>
                  {chatVendor.docs ? (
                    <a
                      href={chatVendor.docs}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      Get API key ↗
                    </a>
                  ) : null}
                </div>

                {chatVendor.kind === 'anthropic' && (
                  <p className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                    Claude uses the Anthropic Messages API — not OpenAI-compatible. Model ID must match your Anthropic account.
                  </p>
                )}

                {chatVendor.usesCustomBase && (
                  <div>
                    <SettingsFieldLabel>Base URL</SettingsFieldLabel>
                    <input
                      type="url"
                      value={snap.customOpenaiBaseUrl || ''}
                      onChange={(e) => onPatchSnap('customOpenaiBaseUrl', e.target.value)}
                      onBlur={(e) => onSave('customOpenaiBaseUrl', e.target.value.trim())}
                      className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                )}

                <div>
                  <SettingsFieldLabel>API key</SettingsFieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="password"
                      value={secretByProvider[chatVendor.id] ?? ''}
                      onChange={(e) =>
                        setSecretByProvider((m) => ({ ...m, [chatVendor.id]: e.target.value }))
                      }
                      placeholder={chatKeySaved ? '••••••••' : 'Paste API key here'}
                      className="input-shadow min-w-[200px] flex-1 px-3 py-2.5"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        chatKf && onSaveKey(chatKf, secretByProvider[chatVendor.id] || '', chatVendor.id)
                      }
                      className="btn-ghost px-4 py-2.5 text-[13px]"
                    >
                      Save key
                    </button>
                  </div>
                </div>

                {chatMf && chatOpts.length > 0 && (
                  <div className="space-y-2">
                    {(chatVendor.id === 'groq' || chatVendor.id === 'nvidia' || chatVendor.id === 'openrouter') && (
                      <p className="text-[11px] leading-relaxed text-zinc-500">
                        Vision models only — Ask AI sends screen captures with your question.
                      </p>
                    )}
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[min(100%,320px)] flex-1">
                        <ModelSelect
                          label={`Model — ${chatOpts.length} available`}
                          value={chatModel || chatVendor.defaultModel || chatOpts[0]}
                          models={chatOpts}
                          listbox={chatOpts.length > 14}
                          onChange={(v) => {
                            onPatchSnap(chatMf, v)
                            onSave(chatMf, v)
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onSyncModels(chatVendor.id)}
                        disabled={chatListLoading}
                        className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                      >
                        {chatListLoading ? 'Syncing…' : 'Sync models'}
                      </button>
                    </div>
                    {chatListErr ? <p className="text-[11px] text-rose-300/80">{chatListErr}</p> : null}
                  </div>
                )}

                {chatMf && chatOpts.length === 0 && (
                  <div className="space-y-2">
                    <ModelInput
                      label={
                        chatListLoading
                          ? 'Loading models…'
                          : chatKeySaved
                            ? 'Model ID'
                            : 'Model ID (save API key first)'
                      }
                      value={chatModel}
                      onChange={(v) => onPatchSnap(chatMf, v)}
                      onCommit={(v) => onSave(chatMf, v)}
                      suggestions={
                        modelCatalog[chatVendor.id] ||
                        (chatVendor.defaultModel ? [chatVendor.defaultModel] : [])
                      }
                      hint="Save your key, then use Sync models to load the full list."
                    />
                    {chatKeySaved ? (
                      <button
                        type="button"
                        onClick={() => onSyncModels(chatVendor.id)}
                        disabled={chatListLoading}
                        className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                      >
                        {chatListLoading ? 'Syncing…' : 'Sync models'}
                      </button>
                    ) : null}
                    {chatListErr ? <p className="text-[11px] text-rose-300/80">{chatListErr}</p> : null}
                  </div>
                )}

                <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {chatTest ? (
                      <div
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${
                          chatTest.success
                            ? 'border-white/[0.08] bg-white/[0.04] text-zinc-300'
                            : 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${chatTest.success ? 'bg-white/60' : 'bg-rose-400'}`}
                        />
                        {chatTest.success ? 'Connection verified' : chatTest.error}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-600">Run a test to verify your key.</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onTestConnection(chatVendor.id)}
                      disabled={chatTesting}
                      className="btn-ghost shrink-0 px-5 py-2 text-[13px] disabled:opacity-50"
                    >
                      {chatTesting ? 'Testing…' : 'Test connection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      {showSetupBanner && (
        <button type="button" onClick={onLaunchFromSetup} className="btn-glow w-full py-4 text-base">
          Launch {name}
        </button>
      )}
    </SettingsPanelShell>
  )
}
