/**
 * Phase 3 smoke test — action chip presets + AI response language block.
 */
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { ACTION_CHIP_PRESETS } = await import(
  pathToFileURL(path.join(appRoot, 'renderer/overlay/actionChipPresets.js')).href
)
const { buildAiResponseLanguageBlock } = require(path.join(appRoot, 'lib/aiResponseLanguage.cjs'))

if (!ACTION_CHIP_PRESETS.length || ACTION_CHIP_PRESETS.length < 4) {
  throw new Error('expected 4 action chip presets')
}
for (const chip of ACTION_CHIP_PRESETS) {
  if (!chip.prompt || chip.prompt.length < 10) throw new Error(`bad chip prompt: ${chip.id}`)
}

if (buildAiResponseLanguageBlock('') !== '') throw new Error('empty lang should be blank')
if (!buildAiResponseLanguageBlock('hi').includes('Hindi')) throw new Error('hi block missing')
if (!buildAiResponseLanguageBlock('en').includes('English')) throw new Error('en block missing English')

console.log('OK phase3', { chips: ACTION_CHIP_PRESETS.length })
