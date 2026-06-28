/**
 * Phase 7 smoke test — optional STT providers + local model preference + device store keys.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const routing = require(path.join(appRoot, 'lib/transcriptionRouting.js'))
const streaming = require(path.join(appRoot, 'lib/streamingSttRouter.js'))
const { resolveLocalModel, MOONSHINE_BASE, MOONSHINE_TINY } = require(path.join(appRoot, 'lib/localStt/modelConfig.js'))
const { getSttProviderMetadataForUI, STT_CAPABLE_IDS } = require(path.join(appRoot, 'lib/providers.js'))

const expectedStreaming = ['deepgram', 'elevenlabs', 'azure', 'google', 'soniox']
for (const id of expectedStreaming) {
  if (!routing.NATIVE_STT_PROVIDER_IDS.includes(id)) {
    throw new Error(`NATIVE_STT_PROVIDER_IDS missing ${id}`)
  }
  if (!streaming.isStreamingProvider(id)) {
    throw new Error(`streaming router missing ${id}`)
  }
}

const mockGet = (data) => (key) => data[key]
for (const prov of expectedStreaming) {
  const keyField = routing.DEDICATED_STT[prov]?.keyField
  const { cfg } = routing.resolveSttConfigForProvider(prov, mockGet({ [keyField]: 'test-key' }))
  if (!cfg?.useMainProcessStt) throw new Error(`${prov} should use main-process STT`)
  const expectedKind = `${prov}_streaming`
  if (cfg.sttKind !== expectedKind) {
    throw new Error(`${prov} sttKind mismatch: ${cfg.sttKind} !== ${expectedKind}`)
  }
}

const uiMeta = getSttProviderMetadataForUI()
if (uiMeta.length !== STT_CAPABLE_IDS.length) {
  throw new Error(`STT UI metadata count ${uiMeta.length} !== ${STT_CAPABLE_IDS.length}`)
}

const enAuto = resolveLocalModel('en', 'auto')
if (enAuto.modelId !== MOONSHINE_BASE) throw new Error('auto en should pick moonshine-base')

const enTiny = resolveLocalModel('en', 'moonshine-tiny')
if (enTiny.modelId !== MOONSHINE_TINY) throw new Error('moonshine-tiny preference failed')

const hiAuto = resolveLocalModel('hi', 'auto')
if (!hiAuto.modelId.includes('whisper')) throw new Error('auto hi should pick whisper')

console.log('OK phase7 stt-routing', {
  nativeProviders: routing.NATIVE_STT_PROVIDER_IDS.length,
  streaming: expectedStreaming.length,
  uiProviders: uiMeta.length,
})
