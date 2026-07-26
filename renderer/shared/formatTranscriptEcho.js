// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { normalizeSpeakerLine } from './speakerDisplayLine.js'

/**
 * Strip LLM section headers from segmented transcript echoes before showing in the overlay.
 * Returns the active question for display and optional earlier context for a muted block.
 */
export function parseTranscriptEchoForDisplay(raw) {
  const t = String(raw || '').trim()
  if (!t) return { question: '', context: null }

  if (/## ACTIVE QUESTION/i.test(t)) {
    const activeMatch = t.match(/## ACTIVE QUESTION[^\n]*\n([\s\S]*?)(?=\n## |$)/i)
    const contextMatch = t.match(/## RECENT CONTEXT[^\n]*\n([\s\S]*?)(?=\n## |$)/i)
    const question = normalizeSpeakerLine(activeMatch?.[1]?.trim() || '')
    const contextRaw = contextMatch?.[1]?.trim()
    const context = contextRaw
      ? contextRaw.split('\n').map(normalizeSpeakerLine).filter(Boolean).join('\n')
      : null
    return { question, context }
  }

  if (/\[(INTERVIEWER|ME)\]:/i.test(t)) {
    const lines = t.split('\n').map((line) => line.trim()).filter(Boolean)
    let question = ''
    const contextLines = []
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const match = lines[index].match(/^\[(INTERVIEWER|ME)\]:\s*(.+)$/i)
      if (!match) continue
      const body = normalizeSpeakerLine(match[2])
      if (!question && match[1].toUpperCase() === 'INTERVIEWER') {
        question = body
      } else {
        contextLines.unshift(body)
      }
    }
    if (!question) {
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const me = lines[index].match(/^\[ME\]:\s*(.+)$/i)
        if (me?.[1]) {
          question = normalizeSpeakerLine(me[1])
          break
        }
      }
    }
    return {
      question,
      context: contextLines.length ? contextLines.join('\n') : null,
    }
  }

  const legacyTranscriptMatch = t.match(/## TRANSCRIPT[^\n]*\n([\s\S]*?)(?=\n## |$)/i)
  if (legacyTranscriptMatch?.[1]?.trim()) {
    const body = legacyTranscriptMatch[1].trim()
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length > 1) {
      return {
        question: normalizeSpeakerLine(lines[lines.length - 1]),
        context: lines.slice(0, -1).map(normalizeSpeakerLine).join('\n'),
      }
    }
    return { question: normalizeSpeakerLine(body), context: null }
  }

  const stripped = t.replace(/^## [^\n]+\n?/gm, '').trim()
  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) {
    return {
      question: normalizeSpeakerLine(lines[lines.length - 1]),
      context: lines.slice(0, -1).map(normalizeSpeakerLine).join('\n'),
    }
  }
  return { question: normalizeSpeakerLine(stripped || t), context: null }
}

export { normalizeSpeakerLine, parseSpeakerDisplayLine } from './speakerDisplayLine.js'
