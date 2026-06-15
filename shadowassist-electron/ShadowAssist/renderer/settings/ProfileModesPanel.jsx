// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { MODE_TEMPLATES } from '../../lib/modeTemplates'
import TemplateModeIcon from './TemplateModeIcons'

const CONTENT_MAX = 12000
const NAME_MAX = 64
const NOTE_TITLE_MAX = 80
const NOTE_INSTRUCTIONS_MAX = 400

function newNotesSectionId() {
  return `ns-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function DocIcon({ className = '' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5L9 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 1.5V5.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="8" fill="#3b82f6" />
      <path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 4.5h9M5.5 4.5V3.5a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.5 7a1 1 0 001 1h4a1 1 0 001-1l.5-7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProfileModesPanel({
  contextPrompts,
  activeContextPromptId,
  activePrompt,
  draftName,
  draftContent,
  draftNotesSections,
  contextIndexing,
  uploadBusy,
  showTemplates,
  onDraftNameChange,
  onDraftContentChange,
  onDraftNotesSectionsChange,
  onSelectPrompt,
  onAddEmptyMode,
  onAddFromTemplate,
  onDeletePrompt,
  onSavePrompt,
  onUploadFile,
  onRemoveFile,
  onToggleTemplates,
}) {
  const handleDelete = (id, name) => {
    const label = name || 'this mode'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    void onDeletePrompt(id)
  }

  const hasNotesTemplate = draftNotesSections.length > 0

  const updateNotesSection = (index, field, value) => {
    const next = draftNotesSections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    )
    onDraftNotesSectionsChange(next)
  }

  const removeNotesSection = (index) => {
    onDraftNotesSectionsChange(draftNotesSections.filter((_, i) => i !== index))
  }

  const addNotesSection = () => {
    onDraftNotesSectionsChange([
      ...draftNotesSections,
      { id: newNotesSectionId(), title: 'New section', instructions: '' },
    ])
  }

  const removeNotesTemplate = () => {
    if (!hasNotesTemplate) return
    if (!window.confirm('Remove the notes template from this mode?')) return
    onDraftNotesSectionsChange([])
  }

  const startNotesTemplate = () => {
    onDraftNotesSectionsChange([
      { id: newNotesSectionId(), title: 'Overview', instructions: 'Instructions for VeilAssist.' },
    ])
  }

  return (
    <div className="profile-modes-root animate-fade-in flex min-h-[520px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
      <aside className="mode-sidebar flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-black/25">
        <div className="shrink-0 p-3">
          <button
            type="button"
            onClick={() => void onAddEmptyMode()}
            className="mode-new-btn w-full rounded-lg border border-white/15 px-3 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            + New mode
          </button>
        </div>

        <div className="mode-sidebar-list min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {contextPrompts.map((p) => {
            const active = p.id === activeContextPromptId
            return (
              <div
                key={p.id}
                className={`mode-sidebar-item group mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                  active ? 'mode-sidebar-item-active' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => void onSelectPrompt(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <DocIcon className="shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">{p.name}</span>
                  {active ? <CheckIcon /> : null}
                </button>
                <button
                  type="button"
                  title={`Delete ${p.name}`}
                  aria-label={`Delete ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(p.id, p.name)
                  }}
                  className="mode-delete-btn shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] p-2">
          <button
            type="button"
            onClick={onToggleTemplates}
            className={`mode-templates-btn flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium transition-colors ${
              showTemplates ? 'bg-white/[0.06] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <rect x="1" y="1" width="5" height="5" rx="1" />
              <rect x="8" y="1" width="5" height="5" rx="1" />
              <rect x="1" y="8" width="5" height="5" rx="1" />
              <rect x="8" y="8" width="5" height="5" rx="1" />
            </svg>
            VeilAssist templates
          </button>
        </div>
      </aside>

      <div className="mode-main min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {showTemplates ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Templates</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Get started by selecting a template or start from an empty mode.
            </p>
            <ul className="mt-6 space-y-1">
              {MODE_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void onAddFromTemplate(t)}
                    className="mode-template-card flex w-full items-start gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <TemplateModeIcon icon={t.icon} color={t.color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-medium text-white">{t.name}</span>
                        <span className="text-zinc-600" aria-hidden>
                          ›
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{t.description}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : activePrompt ? (
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <input
                type="text"
                value={draftName}
                onChange={(e) => onDraftNameChange(e.target.value.slice(0, NAME_MAX))}
                className="min-w-0 flex-1 bg-transparent text-2xl font-bold tracking-tight text-white outline-none placeholder:text-zinc-600"
                placeholder="Mode name"
              />
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400">
                  ✓ Active
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(activeContextPromptId, draftName)}
                  className="rounded-md border border-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400/90 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete mode
                </button>
              </div>
            </div>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-white">Real-time prompt</h4>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80">
                <textarea
                  value={draftContent}
                  onChange={(e) => onDraftContentChange(e.target.value.slice(0, CONTENT_MAX))}
                  rows={16}
                  className="w-full resize-y bg-transparent px-4 py-4 font-mono text-[13px] leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-600"
                  placeholder="How should the AI behave in this mode? Role, goals, tone, bullet points…"
                />
                <div className="flex items-center justify-end gap-3 border-t border-white/5 px-3 py-2">
                  {contextIndexing ? <span className="text-[10px] text-zinc-500">Indexing…</span> : null}
                  <button
                    type="button"
                    onClick={() => void onSavePrompt()}
                    disabled={contextIndexing}
                    className="rounded-md border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    Save mode
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-white">Reference files</h4>
              <div className="rounded-xl border border-dashed border-white/12 bg-zinc-950/40 px-6 py-14 text-center">
                <p className="mb-5 text-sm text-zinc-500">Add files as real-time context.</p>
                <button
                  type="button"
                  onClick={() => void onUploadFile()}
                  disabled={uploadBusy || contextIndexing}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.07] disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M7 1v8M4 4l3-3 3 3M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {uploadBusy ? 'Uploading…' : 'Upload file'}
                </button>
                <p className="mt-3 text-[10px] text-zinc-600">PDF or TXT</p>
              </div>
              {(activePrompt.referenceFiles || []).length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {(activePrompt.referenceFiles || []).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-300"
                    >
                      <span className="min-w-0 truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => void onRemoveFile(f.id)}
                        className="shrink-0 text-xs text-zinc-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-white">Notes template</h4>
                {hasNotesTemplate ? (
                  <button
                    type="button"
                    onClick={removeNotesTemplate}
                    className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Remove template
                  </button>
                ) : null}
              </div>

              {hasNotesTemplate ? (
                <div className="space-y-3">
                  {draftNotesSections.map((section, index) => (
                    <div
                      key={section.id || index}
                      className="notes-section-card relative rounded-xl border border-white/10 bg-zinc-950/60 p-4"
                    >
                      <button
                        type="button"
                        onClick={() => removeNotesSection(index)}
                        className="absolute right-3 top-3 rounded p-1 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
                        aria-label="Remove section"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateNotesSection(index, 'title', e.target.value.slice(0, NOTE_TITLE_MAX))}
                        className="mb-2 w-full bg-transparent pr-8 text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
                        placeholder="Section title"
                      />
                      <textarea
                        value={section.instructions}
                        onChange={(e) =>
                          updateNotesSection(index, 'instructions', e.target.value.slice(0, NOTE_INSTRUCTIONS_MAX))
                        }
                        rows={2}
                        className="w-full resize-y bg-transparent text-[13px] leading-relaxed text-zinc-500 outline-none placeholder:text-zinc-700"
                        placeholder="What should go in this section?"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNotesSection}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/12 py-3 text-sm text-zinc-500 transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:text-zinc-300"
                  >
                    <span className="text-base leading-none">+</span>
                    Add section
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startNotesTemplate}
                  className="w-full rounded-xl border border-dashed border-white/12 py-8 text-center text-sm text-zinc-500 transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:text-zinc-300"
                >
                  + Add notes template
                </button>
              )}
            </section>
          </div>
        ) : (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
            <p className="mb-2 text-sm text-zinc-400">No mode selected</p>
            <p className="mb-6 max-w-sm text-[13px] text-zinc-600">
              Create a new mode or pick a template to customize how VeilAssist responds.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void onAddEmptyMode()}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]"
              >
                + New mode
              </button>
              <button
                type="button"
                onClick={onToggleTemplates}
                className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/15"
              >
                Browse templates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
