/**
 * Smoke test: intelligenceFlags registry (Phase 2).
 * Usage: node scripts/test-intelligence-flags.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const {
  listIntelligenceFlags,
  CORE_FLAG_KEYS,
  ADVANCED_GROUP_ORDER,
} = require(path.join(appRoot, 'lib', 'intelligenceFlags.js'))

const flags = listIntelligenceFlags()
if (!flags.length) throw new Error('no flags')
if (!CORE_FLAG_KEYS.length) throw new Error('no core keys')
if (!ADVANCED_GROUP_ORDER.length) throw new Error('no advanced groups')

const core = flags.filter((f) => f.tier === 'core' && f.implemented)
for (const f of core) {
  if (!CORE_FLAG_KEYS.includes(f.storeKey)) throw new Error(`core flag missing from CORE_FLAG_KEYS: ${f.storeKey}`)
}

const advanced = flags.filter((f) => f.tier === 'advanced')
for (const f of advanced) {
  if (!f.phase) throw new Error(`advanced flag missing phase: ${f.id}`)
}

const implementedAdvanced = advanced.filter((f) => f.implemented)
const pendingAdvanced = advanced.filter((f) => !f.implemented)
console.log('OK intelligenceFlags', {
  total: flags.length,
  core: core.length,
  advanced: advanced.length,
  implementedAdvanced: implementedAdvanced.length,
  pendingAdvanced: pendingAdvanced.length,
})
