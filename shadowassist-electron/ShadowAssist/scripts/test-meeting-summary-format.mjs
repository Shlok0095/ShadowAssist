/**
 * Test meeting summary markdown normalization.
 * Usage: node scripts/test-meeting-summary-format.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { normalizeMeetingSummaryMarkdown } = require(path.join(appRoot, 'lib', 'meetingSummaryFormat.js'))

let passed = 0
function pass(msg) { console.log(`PASS  ${msg}`); passed++ }
function fail(msg, e) { console.error(`FAIL  ${msg} — ${e?.message || e}`) }

const raw = `**Overview**
The conversation revolves around survival and relationships.

**Key points**
* The participant clarified training was in the city.
* Women can make their husbands weak.

**Decisions**
* No explicit decisions are made in the conversation.

**Action items**
* No specific action items are mentioned.`

const out = normalizeMeetingSummaryMarkdown(raw)

if (!out.startsWith('## Overview')) fail('bold overview -> h2', new Error(out.slice(0, 40)))
else pass('**Overview** converted to ## Overview')

if (out.includes('* The participant')) fail('asterisk bullets', new Error('still has *'))
else if (!out.includes('- The participant')) fail('hyphen bullets', new Error(out))
else pass('* bullets converted to -')

if (/## Decisions/i.test(out)) fail('empty decisions removed', new Error(out))
else pass('empty Decisions section stripped')

if (/## Action items/i.test(out)) fail('empty actions removed', new Error(out))
else pass('empty Action items section stripped')

console.log('')
console.log(`Done: ${passed} passed`)
process.exit(passed >= 4 ? 0 : 1)
