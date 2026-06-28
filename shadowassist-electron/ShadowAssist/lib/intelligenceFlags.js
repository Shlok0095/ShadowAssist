// Copyright (c) 2026 VeilAssist. All rights reserved.
// Central registry for intelligence / feature toggles (Phase 0 guardrail).
// Tier model aligned with Natively IntelligenceSettings.tsx:
//   core     — default-on quality features wired today (master switch governs these)
//   advanced — opt-in; shown under Customize (disabled until implemented)
//   dev      — reserved / diagnostics

/** @typedef {{ id: string, storeKey: string, label: string, description: string, group: string, tier: 'core'|'advanced'|'dev', defaultOn: boolean, implemented: boolean, phase?: number }} IntelligenceFlag */

/** @type {IntelligenceFlag[]} */
const INTELLIGENCE_FLAGS = [
  {
    id: 'routing',
    storeKey: 'intelligenceRoutingEnabled',
    label: 'Smart context routing',
    description: 'Include resume, JD, and reference files only when the question needs them.',
    group: 'Answer quality',
    tier: 'core',
    defaultOn: true,
    implemented: true,
  },
  {
    id: 'ltm',
    storeKey: 'longTermMemoryEnabled',
    label: 'Long-term memory',
    description: 'Retain meeting summaries locally and recall on backward-looking questions.',
    group: 'Memory',
    tier: 'core',
    defaultOn: true,
    implemented: true,
  },
  {
    id: 'modeDetect',
    storeKey: 'meetingModeAutoDetectEnabled',
    label: 'Auto-detect meeting type',
    description: 'Suggest profile mode switches from live transcript keywords during Listen.',
    group: 'Meeting notes',
    tier: 'core',
    defaultOn: true,
    implemented: true,
  },
  {
    id: 'followUpDraft',
    storeKey: 'followUpDraftEnabled',
    label: 'Smart follow-up drafts',
    description: 'Generate a copy-ready follow-up from session decisions and action items.',
    group: 'Meeting notes',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 4,
  },
  {
    id: 'vectorMemory',
    storeKey: 'vectorMemoryEnabled',
    label: 'Vector memory',
    description: 'Semantic recall over past meetings; keyword fallback always kept.',
    group: 'Memory',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 6,
  },
  {
    id: 'globalMeetingSearch',
    storeKey: 'globalMeetingSearchEnabled',
    label: 'Search past meetings',
    description: 'Search pill in overlay for saved session recaps (vector + keyword).',
    group: 'Search',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 6,
  },
  {
    id: 'profileTreeV2',
    storeKey: 'profileTreeV2Enabled',
    label: 'Stronger candidate voice',
    description: 'Keep answers anchored to structured resume/JD sections (first person, your experience).',
    group: 'Answer quality',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 9,
  },
  {
    id: 'answerDiversity',
    storeKey: 'answerDiversityEnabled',
    label: 'Answer diversity',
    description: 'Slight variation in phrasing across similar asks.',
    group: 'Answer quality',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 9,
  },
  {
    id: 'referenceVectorIndex',
    storeKey: 'referenceVectorIndexEnabled',
    label: 'Reference file vectors',
    description: 'Embed playbook/reference chunks for semantic retrieval; keyword fallback always kept.',
    group: 'Answer quality',
    tier: 'advanced',
    defaultOn: false,
    implemented: true,
    phase: 9,
  },
]

const CORE_FLAG_KEYS = INTELLIGENCE_FLAGS.filter((f) => f.tier === 'core' && f.implemented).map((f) => f.storeKey)

const ADVANCED_GROUP_ORDER = ['Meeting notes', 'Memory', 'Answer quality', 'Search']

function listIntelligenceFlags() {
  return INTELLIGENCE_FLAGS.slice()
}

function getFlagByStoreKey(storeKey) {
  return INTELLIGENCE_FLAGS.find((f) => f.storeKey === storeKey) || null
}

function listCoreFlags() {
  return INTELLIGENCE_FLAGS.filter((f) => f.tier === 'core' && f.implemented)
}

function listAdvancedFlags() {
  return INTELLIGENCE_FLAGS.filter((f) => f.tier === 'advanced')
}

module.exports = {
  INTELLIGENCE_FLAGS,
  CORE_FLAG_KEYS,
  ADVANCED_GROUP_ORDER,
  listIntelligenceFlags,
  getFlagByStoreKey,
  listCoreFlags,
  listAdvancedFlags,
}
