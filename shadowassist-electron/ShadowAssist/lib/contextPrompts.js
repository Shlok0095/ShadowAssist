// Copyright (c) 2026 VeilAssist. All rights reserved.
// Cluely-style saved references: one text block per prompt, vector-indexed when long.

const CONTENT_MAX = 12000
const KNOWLEDGE_BASE_MAX = 12000
const NAME_MAX = 64
const HISTORY_MAX = 20
const INJECT_MAX = 8000
const MAX_REFERENCE_FILES = 20
const REFERENCE_FILE_MAX_CHARS = 80000
const NOTES_SECTION_MAX = 16
const NOTE_TITLE_MAX = 80
const NOTE_INSTRUCTIONS_MAX = 400

function newNotesSectionId() {
  return `ns-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeNotesSections(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((s, i) => {
      if (!s || typeof s !== 'object') return null
      const title = String(s.title || '').trim().slice(0, NOTE_TITLE_MAX)
      const instructions = String(s.instructions || s.description || '').trim().slice(0, NOTE_INSTRUCTIONS_MAX)
      if (!title && !instructions) return null
      return {
        id: String(s.id || `ns-${i}-${Date.now()}`).slice(0, 64),
        title: title || 'Section',
        instructions,
      }
    })
    .filter(Boolean)
    .slice(0, NOTES_SECTION_MAX)
}

function normalizeNotesTemplate(raw) {
  if (!raw) return { sections: [] }
  if (Array.isArray(raw)) return { sections: normalizeNotesSections(raw) }
  if (typeof raw === 'object') return { sections: normalizeNotesSections(raw.sections) }
  return { sections: [] }
}

function cloneNotesSectionsForPrompt(sections) {
  return normalizeNotesSections(sections).map((s) => ({
    id: newNotesSectionId(),
    title: s.title,
    instructions: s.instructions,
  }))
}

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
  const notesTemplate = normalizeNotesTemplate(raw.notesTemplate)
  if (!name) {
    const first = content.split('\n').map((l) => l.trim()).find(Boolean)
    name = (first || 'New prompt').slice(0, NAME_MAX)
  }
  const now = Date.now()
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : now
  const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : now
  return { id, name, content, referenceFiles, notesTemplate, createdAt, updatedAt }
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

function formatNotesTemplateBlock(prompt) {
  const { sections } = normalizeNotesTemplate(prompt?.notesTemplate)
  if (!sections.length) return ''
  const body = sections
    .map((s) => {
      const inst = s.instructions ? `\n${s.instructions}` : ''
      return `### ${s.title}${inst}`
    })
    .join('\n\n')
  return `\n\n---\n## NOTES TEMPLATE (post-meeting only)\nUse these sections ONLY when the user explicitly asks for meeting notes, a summary, or written takeaways — NOT for live coaching replies.\n\n${body}`
}

const INTERVIEWEE_NAME_RE = /\b(looking for work)\b/i
const INTERVIEWEE_CONTENT_RE = /\bi am (?:in a|a .{1,60}? in a) .{0,40}interview\b/i

function isIntervieweeMode(prompt) {
  const name = String(prompt?.name || '')
  const content = promptContent(prompt)
  return INTERVIEWEE_NAME_RE.test(name) || INTERVIEWEE_CONTENT_RE.test(content)
}

function formatModeSessionRules(prompt) {
  const content = promptContent(prompt).trim()
  if (!content) return ''
  const name = String(prompt?.name || 'Mode').trim()

  if (isIntervieweeMode(prompt)) {
    return `

## MODE SESSION RULES — INTERVIEW (priority over ALL other formatting rules)
You are helping the user ANSWER interview questions in real time. The user is the INTERVIEWEE.

- When you see a question from "Participant" in the transcript or a question on screen: provide the DIRECT ANSWER the user should speak — in first person ("I ...").
- NEVER narrate or describe what was asked ("The interviewer asked...", "The participant is asking..."). Just give the answer.
- NEVER open with coaching tips, preamble, or "I'm not sure what you're looking for".
- NEVER ask for clarification — infer from context and answer immediately.
- Keep answers short and speakable: under 120 words unless the question requires technical depth.
- Behavioral questions: STAR structure in 4 brief sentences (Situation / Task / Action / Result).
- Technical questions: direct answer first, then 2–3 supporting points.
- If the screen shows an interview question, answer it directly — treat it as the question being asked TO the user right now.
- Use reference files for the user's real experience and resume — never fabricate.`
  }

  return `

## MODE SESSION RULES (priority over <unclear_or_empty_screen>, <other_content>, and NOTES TEMPLATE headings)
You are the user's live **${name}** assistant. The real-time prompt above defines your role for this turn.

- Follow that prompt: coach the user, suggest what to say, ask discovery questions, handle objections, answer interview questions, etc.
- Treat screen and audio as conversation context for this role — not as a reason to refuse or demand clarification first.
- Do NOT open with "I'm not sure what information you're looking for" or similar ambiguity disclaimers while coaching in this mode.
- Live replies use the normal answer format (Takeaway + prose). Do NOT structure coaching replies with NOTES TEMPLATE section titles (Discovery, Objections, Action items, etc.) unless the user explicitly asks for notes or a summary.
- If the user mentions a product, prospect, or goal (even briefly), help immediately — do not require a fully described sales call before assisting.`
}

function formatActivePromptBlock(prompt) {
  const content = promptContent(prompt).trim()
  if (!content) return ''
  const name = String(prompt?.name || 'Reference').trim()
  const body = content.length > INJECT_MAX ? `${content.slice(0, INJECT_MAX)}\n…` : content
  return `\n\n---\n## ACTIVE PROMPT (${name})\n${body}${formatModeSessionRules(prompt)}`
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
  NOTES_SECTION_MAX,
  NOTE_TITLE_MAX,
  NOTE_INSTRUCTIONS_MAX,
  newNotesSectionId,
  normalizeNotesTemplate,
  normalizeNotesSections,
  cloneNotesSectionsForPrompt,
  formatNotesTemplateBlock,
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
