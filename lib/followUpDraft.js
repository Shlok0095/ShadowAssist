// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 4 — follow-up email draft from saved session summary (no capture).

const providers = require('./providers')
const { extractActionItems, extractDecisions } = require('./meetingSessionUtils')

const FOLLOW_UP_SYSTEM = `You write concise, professional follow-up emails after meetings.
Use only facts from the provided summary. Do not invent attendees, dates, or commitments.
Output format:
Subject: <one line>

<body paragraphs — polite, clear, under 220 words unless many action items>`

/**
 * @param {object} session Saved meeting session record
 * @param {{ store: { get: Function }, getAiClient: Function }} deps
 * @returns {Promise<{ text: string, source: 'llm' | 'fallback' }>}
 */
async function generateFollowUpDraft(session, { store, getAiClient }) {
  const summary = String(session?.summary || '').trim()
  const modeName = String(session?.modeName || 'Meeting').trim()
  const actions = extractActionItems(summary)
  const decisions = extractDecisions(summary)

  const fallbackBody = [
    `Subject: Follow-up — ${modeName}`,
    '',
    'Hi,',
    '',
    'Thank you for your time today. Here is a quick recap of what we covered:',
    '',
    summary.split('\n').slice(0, 8).join('\n') || '(see session notes)',
    '',
    actions.length ? `Next steps:\n${actions.map((a) => `- ${a}`).join('\n')}` : '',
    '',
    'Best regards,',
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (store.get('followUpDraftEnabled') !== true) {
    return { text: fallbackBody, source: 'fallback', disabled: true }
  }

  const provider = store.get('provider') || 'nvidia'
  const keyField = providers.getApiKeyField(provider)
  const apiKey = store.get(keyField)
  if (!apiKey) {
    return { text: fallbackBody, source: 'fallback' }
  }

  const user = [
    `Meeting mode: ${modeName}`,
    `Duration: ~${Math.round((session.durationMs || 0) / 60000)} min`,
    '',
    '## Summary',
    summary.slice(0, 12000),
    actions.length ? `\n## Action items\n${actions.map((a) => `- ${a}`).join('\n')}` : '',
    decisions.length ? `\n## Decisions\n${decisions.map((d) => `- ${d}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const { completeChat } = getAiClient()
    const model = providers.getModelForProvider(provider, (k) => store.get(k))
    const text = await completeChat(
      provider,
      apiKey,
      {
        model,
        messages: [
          { role: 'system', content: FOLLOW_UP_SYSTEM },
          { role: 'user', content: user },
        ],
        maxTokens: 900,
        temperature: 0.4,
      },
      (k) => store.get(k),
    )
    const out = String(text || '').trim()
    if (out.length < 40) return { text: fallbackBody, source: 'fallback' }
    return { text: out, source: 'llm' }
  } catch (err) {
    console.warn('[follow-up-draft] LLM failed:', err?.message || err)
    return { text: fallbackBody, source: 'fallback' }
  }
}

module.exports = { generateFollowUpDraft }
