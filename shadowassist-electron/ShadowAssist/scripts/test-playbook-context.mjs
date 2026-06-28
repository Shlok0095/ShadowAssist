/**
 * Smoke test: playbookParser + contextVectorStore + meeting sessions store.
 * Usage: node scripts/test-playbook-context.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const results = []

function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, err) {
  const msg = err?.message || String(err)
  results.push({ ok: false, name, detail: msg })
  console.error(`FAIL  ${name} — ${msg}`)
}

const tmpDir = path.join(appRoot, '.test-tmp')
fs.mkdirSync(tmpDir, { recursive: true })

// ── 1. playbookParser ─────────────────────────────────────────────────────
try {
  const { parsePlaybookFile } = require(path.join(appRoot, 'lib', 'playbookParser.js'))
  const txtPath = path.join(tmpDir, 'playbook-sample.txt')
  fs.writeFileSync(
    txtPath,
    'Sales playbook: Always qualify budget. Objection: price → ROI in 90 days.\n',
    'utf8',
  )
  const txt = await parsePlaybookFile(txtPath)
  if (!txt.includes('qualify budget')) throw new Error('TXT parse missing content')
  pass('playbookParser TXT')

  const badExt = path.join(tmpDir, 'bad-type.xyz')
  fs.writeFileSync(badExt, 'x', 'utf8')
  try {
    await parsePlaybookFile(badExt)
    fail('playbookParser rejects bad ext', new Error('should have thrown'))
  } catch (e) {
    if (String(e.message).includes('Unsupported')) pass('playbookParser rejects bad ext')
    else fail('playbookParser rejects bad ext', e)
  }
} catch (e) {
  fail('playbookParser', e)
}

// ── 2. contextVectorStore ─────────────────────────────────────────────────
try {
  const store = require(path.join(appRoot, 'lib', 'store.js'))
  const cv = require(path.join(appRoot, 'lib', 'contextVectorStore.js'))
  const { INJECT_MAX } = require(path.join(appRoot, 'lib', 'contextPrompts.js'))

  const bigText = 'pricing objection ROI discount enterprise buyer '.repeat(400)
  const prompts = [
    {
      id: 'test-prompt-1',
      name: 'Sales',
      content: 'Help with sales calls.',
      referenceFiles: [{ id: 'rf-1', name: 'playbook.txt', text: bigText }],
      notesTemplate: { sections: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  const { promptCount } = cv.indexAllPrompts(prompts, store)
  if (promptCount !== 1) throw new Error(`expected 1 indexed prompt, got ${promptCount}`)

  const meta = store.get('contextIndexMeta')
  const chunks = meta?.['test-prompt-1']?.chunks
  if (!Array.isArray(chunks) || chunks.length < 5) {
    throw new Error(`expected many chunks, got ${chunks?.length}`)
  }
  pass('contextVectorStore index', `${chunks.length} chunks`)

  const needs = cv.referenceNeedsRetrieval(prompts[0])
  if (!needs) throw new Error('large file should need retrieval')
  pass('referenceNeedsRetrieval', `threshold > ${INJECT_MAX}`)

  const retrieved = cv.retrieveChunks('test-prompt-1', 'pricing objection enterprise', {}, store)
  if (!retrieved.length) throw new Error('no chunks retrieved')
  const joined = retrieved.map((c) => c.text).join(' ')
  if (!/pricing|objection|enterprise/i.test(joined)) {
    throw new Error('retrieved chunks missing query terms')
  }
  pass('contextVectorStore retrieve', `${retrieved.length} chunks matched`)

  const block = cv.formatRetrievedReferenceBlock(retrieved)
  if (!block.includes('REFERENCE FILES')) throw new Error('format block invalid')
  pass('formatRetrievedReferenceBlock')
} catch (e) {
  fail('contextVectorStore', e)
}

// ── 3. meeting sessions (prior feature) ─────────────────────────────────
try {
  const store = require(path.join(appRoot, 'lib', 'store.js'))
  const { createMeetingSessionsStore } = require(path.join(appRoot, 'lib', 'meetingSessions.js'))
  const sr = require(path.join(appRoot, 'lib', 'sessionRecorder.js'))
  const { generateMeetingSummary, buildFallbackSummary } = require(path.join(appRoot, 'lib', 'meetingSummary.js'))

  const ms = createMeetingSessionsStore(store)
  sr.begin({ modeName: 'Test', notesSectionTitles: ['Overview'] })
  sr.appendTranscript('Me: discussed Q3 roadmap')
  sr.recordExchange('What should I say?', 'Focus on milestones and owners.')
  const snap = sr.end()
  if (!sr.hasContent(snap)) throw new Error('snapshot empty')

  const summary = buildFallbackSummary(snap)
  if (!summary.includes('roadmap')) throw new Error('fallback summary missing transcript')

  const saved = ms.save(snap, { text: summary, source: 'fallback' })
  const listed = ms.list()
  if (!listed.find((s) => s.id === saved.id)) throw new Error('session not in list')
  pass('meetingSessions save/list')

  const llmSummary = await generateMeetingSummary(snap, { store, getAiClient: () => ({ completeChat: async () => '' }) })
  if (!llmSummary.text) throw new Error('no fallback from empty LLM')
  pass('meetingSummary fallback path')
} catch (e) {
  fail('meetingSessions', e)
}

// ── 4. main process syntax / require order (no Electron app) ─────────────
try {
  const mainPath = path.join(appRoot, 'main', 'index.js')
  const src = fs.readFileSync(mainPath, 'utf8')
  const createLine = src.split('\n').findIndex((l) => l.includes('createMeetingSessionsStore(store)'))
  const requireLine = src.split('\n').findIndex((l) => l.includes("require('../lib/meetingSessions')"))
  if (createLine < requireLine) {
    throw new Error('createMeetingSessionsStore called before require (TDZ bug)')
  }
  if (!src.includes("ipcMain.handle('parse-playbook'")) {
    throw new Error('parse-playbook IPC handler missing')
  }
  if (!src.includes('contextVectorStore.indexAllPrompts')) {
    throw new Error('context index on save missing')
  }
  pass('main/index.js wiring checks')
} catch (e) {
  fail('main/index wiring', e)
}

// cleanup test prompt from store meta
try {
  const store = require(path.join(appRoot, 'lib', 'store.js'))
  const meta = store.get('contextIndexMeta') || {}
  delete meta['test-prompt-1']
  store.set('contextIndexMeta', meta)
} catch (_) {}

const failed = results.filter((r) => !r.ok)
console.log('')
console.log(`Done: ${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
