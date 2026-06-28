/**
 * Phase 4 smoke test — meeting session utils + follow-up fallback.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const utils = require(path.join(appRoot, 'lib/meetingSessionUtils.js'))
const { createMeetingSessionsStore } = require(path.join(appRoot, 'lib/meetingSessions.js'))
const { generateFollowUpDraft } = require(path.join(appRoot, 'lib/followUpDraft.js'))
const { sessionToMarkdown } = require(path.join(appRoot, 'lib/sessionExport.js'))

const parsed = utils.parseLabeledTranscriptText('Participant: hello there')
if (parsed.speaker !== 'other' || parsed.text !== 'hello there') throw new Error('parse failed')

const actions = utils.extractActionItems('## Action items\n- Send deck\n- Schedule demo')
if (actions.length !== 2) throw new Error('action extract failed')

const mem = { data: {} }
const store = {
  get: (k) => mem.data[k],
  set: (k, v) => { mem.data[k] = v },
}
const ms = createMeetingSessionsStore(store)
const record = ms.save(
  {
    id: 'test-1',
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    modeName: 'Test',
    transcriptLines: [{ at: Date.now(), text: 'Me: hello' }],
    exchanges: [{ at: Date.now(), question: 'Q?', answer: 'A.' }],
  },
  { text: '## Overview\n- Met\n\n## Action items\n- Follow up', source: 'llm' },
)
if (!record.transcriptLines?.length) throw new Error('transcript lines not saved')
const upd = ms.updateSpeakerLabels(record.id, { me: 'Alex', other: 'Client' })
if (upd.session.speakerLabels.me !== 'Alex') throw new Error('speaker update failed')

const md = sessionToMarkdown(upd.session)
if (!md.includes('Alex:')) throw new Error('export missing speaker label')

const draft = await generateFollowUpDraft(upd.session, {
  store: { get: () => undefined },
  getAiClient: () => ({}),
})
if (!draft.text.includes('Follow-up')) throw new Error('fallback draft missing')

console.log('OK phase4', { actions: actions.length, draftLen: draft.text.length })
