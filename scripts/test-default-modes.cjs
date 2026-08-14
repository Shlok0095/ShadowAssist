#!/usr/bin/env node
/**
 * Every shipped default + template mode must classify and inject session rules.
 * Usage: node scripts/test-default-modes.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')

const { MODE_TEMPLATES } = require('../lib/modeTemplates.cjs')
const {
  DEFAULT_CONTEXT_PROMPTS,
  detectLiveModeKind,
  formatActivePromptBlock,
  formatModeSessionRules,
} = require('../lib/contextPrompts')
const { modeTemplateFromPrompt, planAnswer } = require('../lib/answerPlanner')
const { routeContext, formatSpeakerIdentityBlock } = require('../lib/contextRouter')

const EXPECTED = {
  'cp-default-meeting': { kind: 'meeting', template: 'team-meet' },
  'cp-default-interview': { kind: 'interviewee', template: 'looking-for-work' },
  'tmpl-general': { kind: 'general', template: 'general' },
  'tmpl-sales': { kind: 'sales', template: 'sales' },
  'tmpl-recruiting': { kind: 'recruiting', template: 'recruiting' },
  'tmpl-interview': { kind: 'interviewee', template: 'looking-for-work' },
  'tmpl-meeting': { kind: 'meeting', template: 'team-meet' },
  'tmpl-lecture': { kind: 'lecture', template: 'lecture' },
  'tmpl-gen-ai': { kind: 'interviewee', template: 'technical-interview' },
  'tmpl-data-science': { kind: 'interviewee', template: 'technical-interview' },
}

function allShippedModes() {
  return [
    ...DEFAULT_CONTEXT_PROMPTS.map((p) => ({ ...p, source: 'default' })),
    ...MODE_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
      source: 'template',
    })),
  ]
}

test('every shipped mode has an expected kind and template mapping', () => {
  const modes = allShippedModes()
  assert.equal(modes.length, Object.keys(EXPECTED).length)
  for (const mode of modes) {
    const expected = EXPECTED[mode.id]
    assert.ok(expected, `missing expected mapping for ${mode.id} (${mode.name})`)
    assert.equal(detectLiveModeKind(mode), expected.kind, `${mode.name} kind`)
    assert.equal(modeTemplateFromPrompt(mode), expected.template, `${mode.name} template`)
  }
})

test('selecting any shipped mode injects MODE SESSION RULES and forbids VeilAssist intro', () => {
  for (const mode of allShippedModes()) {
    const block = formatActivePromptBlock(mode)
    assert.match(block, /## ACTIVE PROMPT/, mode.name)
    assert.match(block, /MODE SESSION RULES/, `${mode.name} must inject session rules`)
    const rules = formatModeSessionRules(mode)
    assert.match(rules, /NEVER introduce yourself as VeilAssist/i, mode.name)
  }
})

test('interviewee shipped modes keep resume and forbid VeilAssist speaker identity', () => {
  for (const mode of allShippedModes()) {
    if (EXPECTED[mode.id].kind !== 'interviewee') continue
    const template = modeTemplateFromPrompt(mode)
    const plan = planAnswer({
      question: 'Tell me about yourself',
      hasCandidateProfile: true,
      activeMode: template,
    })
    assert.equal(plan.answerType, 'identity_answer', mode.name)
    assert.ok(plan.requiredContextLayers.includes('resume'), mode.name)
    const route = routeContext({
      userQuery: 'Tell me about yourself',
      mode: template,
      profileAvailable: true,
      source: 'manual_input',
    })
    assert.equal(route.useResume, true, mode.name)
    assert.equal(route.domainTag, 'interview', mode.name)
    const identity = formatSpeakerIdentityBlock(route)
    assert.match(identity, /I am VeilAssist/, mode.name)
    assert.match(identity, /FORBIDDEN/i, mode.name)
  }
})

test('recruiting mode does not speak as the candidate', () => {
  const recruiting = MODE_TEMPLATES.find((t) => t.id === 'tmpl-recruiting')
  assert.equal(modeTemplateFromPrompt(recruiting), 'recruiting')
  const route = routeContext({
    userQuery: 'Tell me about yourself',
    mode: 'recruiting',
    profileAvailable: true,
    source: 'manual_input',
  })
  assert.equal(route.domainTag, 'recruiting')
  assert.equal(formatSpeakerIdentityBlock(route), '')
})

test('sales and lecture modes do not require resume', () => {
  const sales = MODE_TEMPLATES.find((t) => t.id === 'tmpl-sales')
  const lecture = MODE_TEMPLATES.find((t) => t.id === 'tmpl-lecture')
  const salesRoute = routeContext({
    userQuery: 'How do we handle pricing objections?',
    mode: modeTemplateFromPrompt(sales),
    profileAvailable: true,
  })
  const lectureRoute = routeContext({
    userQuery: 'Summarize this lecture theorem',
    mode: modeTemplateFromPrompt(lecture),
    profileAvailable: true,
  })
  assert.equal(salesRoute.useResume, false)
  assert.equal(lectureRoute.useResume, false)
  assert.equal(salesRoute.plan.profileContextPolicy, 'forbidden')
  assert.equal(lectureRoute.plan.profileContextPolicy, 'forbidden')
})
