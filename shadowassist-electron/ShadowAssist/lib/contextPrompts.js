// Copyright (c) 2026 VeilAssist. All rights reserved.
// Cluely-style saved references: one text block per prompt, vector-indexed when long.

const CONTENT_MAX = 12000
const KNOWLEDGE_BASE_MAX = 12000
const NAME_MAX = 64
const HISTORY_MAX = 20
const INJECT_MAX = 8000
const MAX_REFERENCE_FILES = 20
const REFERENCE_FILE_MAX_CHARS = 80000

const DEFAULT_CONTEXT_PROMPTS = [
  {
    id: 'cp-default-meeting',
    name: 'Meeting',
    content:
      'Help during live meetings: summarize discussion, clarify decisions, and suggest concise talking points.',
  },
  {
    id: 'cp-default-interview',
    name: 'Interview',
    content:
      'Interview mode: answer confidently, use STAR for behavioral questions, and reference my background when relevant.',
  },
]

function newPromptId() {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function promptContent(raw) {
  if (!raw || typeof raw !== 'object') return ''
  if (String(raw.content || '').trim()) return String(raw.content).trim()
  const parts = [raw.instructions, raw.knowledge].map((s) => String(s || '').trim()).filter(Boolean)
  return parts.join('\n\n')
}

function normalizeReferenceFiles(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((f, i) => {
      if (!f || typeof f !== 'object') return null
      const text = String(f.text || '').slice(0, REFERENCE_FILE_MAX_CHARS)
      if (!text.trim()) return null
      return {
        id: String(f.id || `rf-${i}-${Date.now()}`).slice(0, 64),
        name: String(f.name || 'file.txt').slice(0, 120),
        text,
      }
    })
    .filter(Boolean)
    .slice(0, MAX_REFERENCE_FILES)
}

function normalizePrompt(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || fallbackId || newPromptId()).slice(0, 64)
  let name = String(raw.name || '').trim().slice(0, NAME_MAX)
  const content = promptContent(raw).slice(0, CONTENT_MAX)
  const referenceFiles = normalizeReferenceFiles(raw.referenceFiles)
  if (!name) {
    const first = content.split('\n').map((l) => l.trim()).find(Boolean)
    name = (first || 'New prompt').slice(0, NAME_MAX)
  }
  const now = Date.now()
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : now
  const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : now
  return { id, name, content, referenceFiles, createdAt, updatedAt }
}

function normalizePromptsList(list) {
  if (!Array.isArray(list)) return []
  const out = []
  const seen = new Set()
  for (const item of list) {
    const p = normalizePrompt(item)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

function createPrompt({ name = '', content = '' } = {}) {
  const now = Date.now()
  return normalizePrompt({
    id: newPromptId(),
    name,
    content,
    createdAt: now,
    updatedAt: now,
  })
}

function pushPromptHistory(history, promptId) {
  const id = String(promptId || '').trim()
  if (!id) return Array.isArray(history) ? history.slice(0, HISTORY_MAX) : []
  const prev = Array.isArray(history) ? history.filter((h) => h !== id) : []
  prev.unshift(id)
  return prev.slice(0, HISTORY_MAX)
}

function formatActivePromptBlock(prompt) {
  const content = promptContent(prompt).trim()
  if (!content) return ''
  const name = String(prompt?.name || 'Reference').trim()
  const body = content.length > INJECT_MAX ? `${content.slice(0, INJECT_MAX)}\n…` : content
  return `\n\n---\n## ACTIVE PROMPT (${name})\n${body}`
}

function getActivePrompt(prompts, activeId) {
  const list = normalizePromptsList(prompts)
  if (!activeId) return null
  return list.find((p) => p.id === activeId) || null
}

function migrateContextPromptsFromLegacy(get, set) {
  try {
    let prompts = normalizePromptsList(get('contextPrompts'))
    const profileText = String(get('contextProfile') || '').trim()

    if (prompts.length > 0) {
      prompts = prompts.map((p) => normalizePrompt(p))
      const kb = String(get('knowledgeBase') || profileText || '').trim()
      if (kb) {
        const activeId = get('activeContextPromptId') || prompts[0]?.id
        prompts = prompts.map((p) => {
          if (p.id !== activeId) return p
          const files = normalizeReferenceFiles(p.referenceFiles)
          if (files.some((f) => f.id === 'rf-kb-migrated')) return p
          return {
            ...p,
            referenceFiles: [
              ...files,
              { id: 'rf-kb-migrated', name: 'Knowledge base.txt', text: kb.slice(0, KNOWLEDGE_BASE_MAX) },
            ],
          }
        })
        set('knowledgeBase', '')
      }
      set('contextProfile', '')
      set('contextPrompts', prompts)
      return
    }

    const profiles = get('contextProfiles') || {}
    const meeting = String(profiles.meeting || '').trim()
    const interview = String(profiles.interview || '').trim()
    const general = String(profiles.general || '').trim()
    const resume = String(get('resumeContext') || '').trim()
    const jd = String(get('jdContext') || '').trim()
    const now = Date.now()

    prompts = []
    const bgParts = [profileText, resume, jd].filter(Boolean)
    if (bgParts.length) {
      prompts.push(
        normalizePrompt({
          id: 'cp-migrated-profile',
          name: 'My background',
          content: bgParts.join('\n\n'),
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    if (meeting) {
      prompts.push(
        normalizePrompt({
          id: 'cp-migrated-meeting',
          name: 'Meeting',
          instructions: DEFAULT_CONTEXT_PROMPTS[0].content,
          knowledge: '',
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    if (interview) {
      prompts.push(
        normalizePrompt({
          id: 'cp-migrated-interview',
          name: 'Interview',
          content: interview,
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    if (general) {
      prompts.push(
        normalizePrompt({
          id: 'cp-migrated-general',
          name: 'General',
          content: general,
          createdAt: now,
          updatedAt: now,
        }),
      )
    }

    if (!prompts.length) {
      prompts = DEFAULT_CONTEXT_PROMPTS.map((p) => normalizePrompt(p))
    }

    set('contextPrompts', prompts)
    set('contextProfile', '')
    if (!Array.isArray(get('contextPromptHistory'))) set('contextPromptHistory', [])
    if (!get('activeContextPromptId') && prompts[0]?.id) {
      set('activeContextPromptId', prompts[0].id)
      set('contextPromptHistory', pushPromptHistory([], prompts[0].id))
    }
  } catch (e) {
    console.warn('[contextPrompts] migration:', e?.message || e)
    set('contextPrompts', DEFAULT_CONTEXT_PROMPTS.map((p) => normalizePrompt(p)))
    set('knowledgeBase', '')
    set('contextProfile', '')
    set('contextPromptHistory', [])
  }
}

function referenceFilesText(prompt) {
  return normalizeReferenceFiles(prompt?.referenceFiles)
    .map((f) => f.text)
    .filter(Boolean)
    .join('\n\n')
}

module.exports = {
  CONTENT_MAX,
  KNOWLEDGE_BASE_MAX,
  NAME_MAX,
  HISTORY_MAX,
  INJECT_MAX,
  MAX_REFERENCE_FILES,
  REFERENCE_FILE_MAX_CHARS,
  DEFAULT_CONTEXT_PROMPTS,
  newPromptId,
  normalizePrompt,
  normalizePromptsList,
  createPrompt,
  pushPromptHistory,
  formatActivePromptBlock,
  formatActiveInstructionsBlock: formatActivePromptBlock,
  getActivePrompt,
  promptContent,
  referenceFilesText,
  normalizeReferenceFiles,
  migrateContextPromptsFromLegacy,
}
