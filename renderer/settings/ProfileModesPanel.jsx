// Copyright (c) 2026 VeilAssist. All rights reserved.



import React from 'react'

import {

  Check,

  FileText,

  LayoutGrid,

  Plus,

  Pencil,

  Trash2,

  Upload,

  X,

  Sparkles,

} from 'lucide-react'

import { MODE_TEMPLATES } from '../../lib/modeTemplates'

import TemplateModeIcon from './TemplateModeIcons'

import AppIcon from '../shared/AppIcon'

import { SettingsPage } from './SettingsComponents'



const CONTENT_MAX = 12000

const NAME_MAX = 64

const NOTE_TITLE_MAX = 80

const NOTE_INSTRUCTIONS_MAX = 400



function newNotesSectionId() {

  return `ns-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

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
  const name = 'VeilAssist'
  const [creatingMode, setCreatingMode] = React.useState(false)
  const [newModeName, setNewModeName] = React.useState('')

  const handleDelete = (id, name) => {

    const label = name || 'this mode'

    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return

    void onDeletePrompt(id)

  }

  const openCreateMode = () => {
    setNewModeName('')
    setCreatingMode(true)
  }

  const submitNewMode = async (event) => {
    event?.preventDefault()
    const name = String(newModeName).trim().slice(0, NAME_MAX) || 'New mode'
    setCreatingMode(false)
    setNewModeName('')
    await onAddEmptyMode(name)
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

    <SettingsPage

      wide

      title="Profile"

      description="Persona modes, reference files, and optional resume context."

    >

      <div className="profile-modes-root flex min-h-[480px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">

        <aside className="mode-sidebar flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-black/25">

          <div className="shrink-0 p-3">

            <button

              type="button"

              onClick={openCreateMode}
              disabled={creatingMode || contextIndexing}

              className="mode-new-btn inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04]"

            >

              <AppIcon icon={Plus} size={15} />

              Create mode

            </button>
            {creatingMode ? (
              <form className="mt-2 space-y-2" onSubmit={(event) => void submitNewMode(event)}>
                <input
                  autoFocus
                  type="text"
                  value={newModeName}
                  maxLength={NAME_MAX}
                  placeholder="Mode name"
                  aria-label="New mode name"
                  onChange={(event) => setNewModeName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setCreatingMode(false)
                      setNewModeName('')
                    }
                  }}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/30"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg border border-white/15 bg-white/[0.07] px-2 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10"
                  >
                    Add mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingMode(false)
                      setNewModeName('')
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

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

                    <AppIcon icon={FileText} size={15} className={active ? 'text-accent' : 'text-zinc-500'} />

                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">{p.name}</span>

                    {active ? (

                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent/20 text-accent">

                        <AppIcon icon={Check} size={11} strokeWidth={2.5} />

                      </span>

                    ) : null}

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

                    <AppIcon icon={Trash2} size={14} />

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

              <AppIcon icon={LayoutGrid} size={14} />

              Browse templates

            </button>

          </div>

        </aside>



        <div className="mode-main min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">

          {showTemplates ? (

            <div>

              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">

                <AppIcon icon={Sparkles} size={18} className="text-accent" />

                Starter templates

              </h3>

              <p className="mt-1 text-sm text-zinc-500">

                Pick a persona to clone — you can edit instructions and reference files after.

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

                <div className="min-w-[240px] flex-1">

                  <label htmlFor="profile-mode-name" className="mb-1.5 block text-[11px] font-medium text-zinc-500">

                    Mode name

                  </label>

                  <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-zinc-950/60 px-3 py-2.5 focus-within:border-blue-400/50">

                    <AppIcon icon={Pencil} size={15} className="shrink-0 text-zinc-500" />

                    <input

                      id="profile-mode-name"

                      type="text"

                      value={draftName}

                      onChange={(e) => onDraftNameChange(e.target.value.slice(0, NAME_MAX))}

                      className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight text-white outline-none placeholder:text-zinc-600"

                      placeholder="Enter a mode name"

                    />

                  </div>

                  <p className="mt-1.5 text-[10px] text-zinc-600">Edit this field to rename the mode, then click Save mode.</p>

                </div>

                <div className="flex shrink-0 items-center gap-2">

                  <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-light">

                    <AppIcon icon={Check} size={12} strokeWidth={2.5} className="text-accent-light" />

                    Active

                  </span>

                  <button

                    type="button"

                    onClick={() => handleDelete(activeContextPromptId, draftName)}

                    className="inline-flex items-center gap-1 rounded-md border border-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400/90 transition-colors hover:bg-red-500/10 hover:text-red-300"

                  >

                    <AppIcon icon={Trash2} size={12} />

                    Delete

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

                <div className="rounded-xl border border-dashed border-white/12 bg-zinc-950/40 px-6 py-12 text-center">

                  <p className="mb-4 text-sm text-zinc-500">Playbooks and PDFs attached to this mode only.</p>

                  <button

                    type="button"

                    onClick={() => void onUploadFile()}

                    disabled={uploadBusy || contextIndexing}

                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.07] disabled:opacity-50"

                  >

                    <AppIcon icon={Upload} size={15} />

                    {uploadBusy ? 'Uploading…' : 'Upload file'}

                  </button>

                  <p className="mt-3 text-[10px] text-zinc-600">PDF, TXT, or MD</p>

                </div>

                {(activePrompt.referenceFiles || []).length > 0 ? (

                  <ul className="mt-3 space-y-2">

                    {(activePrompt.referenceFiles || []).map((f) => (

                      <li

                        key={f.id}

                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-300"

                      >

                        <span className="flex min-w-0 items-center gap-2 truncate">

                          <AppIcon icon={FileText} size={14} className="text-zinc-500" />

                          {f.name}

                        </span>

                        <button

                          type="button"

                          onClick={() => void onRemoveFile(f.id)}

                          className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-500 hover:text-red-400"

                        >

                          <AppIcon icon={X} size={12} />

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

                          <AppIcon icon={X} size={12} />

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

                      <AppIcon icon={Plus} size={14} />

                      Add section

                    </button>

                  </div>

                ) : (

                  <button

                    type="button"

                    onClick={startNotesTemplate}

                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/12 py-8 text-center text-sm text-zinc-500 transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:text-zinc-300"

                  >

                    <AppIcon icon={Plus} size={14} />

                    Add notes template

                  </button>

                )}

              </section>

            </div>

          ) : (

            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">

              <AppIcon icon={FileText} size={32} className="mb-3 text-zinc-600" strokeWidth={1.25} />

              <p className="mb-2 text-sm text-zinc-400">No mode selected</p>

              <p className="mb-6 max-w-sm text-[13px] text-zinc-600">

                Create a mode or start from a template to define how {name} responds.

              </p>

              <div className="flex flex-wrap justify-center gap-2">

                <button

                  type="button"

                  onClick={openCreateMode}

                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]"

                >

                  <AppIcon icon={Plus} size={14} />

                  Create mode

                </button>

                <button

                  type="button"

                  onClick={onToggleTemplates}

                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-light hover:bg-accent/15"

                >

                  <AppIcon icon={LayoutGrid} size={14} className="text-accent-light" />

                  Browse templates

                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </SettingsPage>

  )

}


