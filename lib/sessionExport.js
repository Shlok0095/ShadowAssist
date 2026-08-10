// Copyright (c) 2026 VeilAssist. All rights reserved.
// Export meeting session recaps as Markdown.

const { formatStoredTranscriptLine, extractActionItems } = require('./meetingSessionUtils')
const { resolveBrandNameFromStore } = require('./branding')

/**
 * @param {object} session
 * @returns {string}
 */
function sessionToMarkdown(session) {
  if (!session) return ''
  const brandName = resolveBrandNameFromStore()
  const labels = session.speakerLabels || {}
  const lines = []
  lines.push(`# ${session.modeName || `${brandName} Session`}`)
  lines.push('')
  lines.push(`- **Started:** ${new Date(session.startedAt).toLocaleString()}`)
  lines.push(`- **Ended:** ${new Date(session.endedAt).toLocaleString()}`)
  lines.push(`- **Duration:** ${Math.round((session.durationMs || 0) / 60000)} min`)
  lines.push(`- **Summary source:** ${session.summarySource === 'llm' ? 'AI' : 'Local'}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(String(session.summary || '').trim() || '_No summary_')

  const actions = extractActionItems(session.summary)
  if (actions.length) {
    lines.push('')
    lines.push('## Action items')
    lines.push('')
    for (const a of actions) lines.push(`- ${a}`)
  }

  const transcriptLines = Array.isArray(session.transcriptLines) ? session.transcriptLines : []
  if (transcriptLines.length) {
    lines.push('')
    lines.push('## Transcript')
    lines.push('')
    lines.push('```')
    for (const line of transcriptLines) {
      lines.push(formatStoredTranscriptLine(line, labels))
    }
    lines.push('```')
  } else if (session.transcriptPreview) {
    lines.push('')
    lines.push('## Transcript preview')
    lines.push('')
    lines.push('```')
    lines.push(String(session.transcriptPreview).trim())
    lines.push('```')
  }

  if (Array.isArray(session.exchanges) && session.exchanges.length) {
    lines.push('')
    lines.push('## Assistant Q&A')
    lines.push('')
    for (const ex of session.exchanges) {
      lines.push(`**Q:** ${ex.question}`)
      lines.push('')
      lines.push(String(ex.answer || '').trim())
      lines.push('')
    }
  }

  lines.push('')
  lines.push('---')
  lines.push(`_Exported from ${brandName}_`)
  return lines.join('\n')
}

module.exports = { sessionToMarkdown }
