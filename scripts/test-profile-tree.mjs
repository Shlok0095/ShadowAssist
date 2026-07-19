/**
 * Smoke test: profileTreeService resume/JD parsing.
 * Usage: node scripts/test-profile-tree.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { parseResumeTree, parseJdTree, formatResumeBlock, formatJdBlock } = require(path.join(
  appRoot,
  'lib',
  'profileTreeService.js',
))

const resume = `
Summary
Experienced engineer with 8 years in ML.

Experience
Acme Corp — Senior ML Engineer (2020–present)
Built RAG pipelines and evals.

Skills
Python, PyTorch, AWS, RAG
`

const jd = `
Role
Senior ML Engineer

Requirements
5+ years Python, LLM experience, cloud deployment

Responsibilities
Ship production AI features and mentor the team.
`

let passed = 0
const rt = parseResumeTree(resume)
if (rt.sections.experience && rt.skillsList.includes('Python')) {
  console.log('PASS  parseResumeTree sections + skills')
  passed++
} else {
  console.error('FAIL  parseResumeTree', rt)
}

const jt = parseJdTree(jd)
if (jt.sections.requirements && jt.sections.role) {
  console.log('PASS  parseJdTree sections')
  passed++
} else {
  console.error('FAIL  parseJdTree', jt)
}

const block = formatResumeBlock(rt, resume)
if (block.includes('### Experience')) {
  console.log('PASS  formatResumeBlock')
  passed++
} else {
  console.error('FAIL  formatResumeBlock')
}

console.log('')
console.log(`Done: ${passed}/3 passed`)
process.exit(passed === 3 ? 0 : 1)
