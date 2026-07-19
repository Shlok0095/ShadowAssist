/**
 * Phase 5 smoke test — skill invoke parsing + skills service CRUD.
 */
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { parseSkillInvoke, normalizeSkillSlug } = require(path.join(appRoot, 'lib/skillInvoke.cjs'))
const { createSkillsService } = require(path.join(appRoot, 'lib/skillsService.js'))

const parsed = parseSkillInvoke('/interview what should I say?')
if (!parsed || parsed.skillSlug !== 'interview' || parsed.question !== 'what should I say?') {
  throw new Error('parseSkillInvoke failed')
}
if (parseSkillInvoke('hello /nope')) throw new Error('should not parse non-prefix')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'veil-skills-'))
const svc = createSkillsService({ skillsRoot: tmp })
const saved = svc.save('interview', { name: 'Interview', body: 'Coach mode on.' })
if (!saved.ok) throw new Error('save failed')
const block = svc.buildSkillBlock('interview')
if (!block.includes('Coach mode')) throw new Error('skill block missing body')
if (svc.list().length !== 1) throw new Error('list failed')
svc.remove('interview')
if (svc.list().length !== 0) throw new Error('remove failed')
if (normalizeSkillSlug('  My Skill  ') !== 'my-skill') throw new Error('slug normalize')

fs.rmSync(tmp, { recursive: true, force: true })
console.log('OK phase5 skills')
