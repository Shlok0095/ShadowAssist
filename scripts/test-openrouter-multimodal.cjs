#!/usr/bin/env node
/**
 * Smoke-test OpenRouter text + vision models.
 * Usage: OPENROUTER_API_KEY=sk-or-... node scripts/test-openrouter-multimodal.cjs
 */
const providers = require('../lib/providers')
const { completeChat } = require('../lib/aiClient')
const { listRemoteModels } = require('../lib/remoteModels')
const { isMultimodalChatModel } = require('../lib/chatMultimodalModels')

const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim()
if (!apiKey) {
  console.error('Set OPENROUTER_API_KEY')
  process.exit(1)
}

const getStore = (key) => {
  if (key === 'openrouterKey') return apiKey
  if (key === 'openrouterModel') return 'google/gemini-2.5-flash'
  return ''
}

/** 1x1 red PNG */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const CANDIDATES = [
  'google/gemini-2.5-flash',
  'google/gemini-3.5-flash-lite',
  'openai/gpt-4o-mini',
  'qwen/qwen2.5-vl-72b-instruct',
]

async function tryModel(model, messages, label) {
  const t0 = Date.now()
  try {
    const text = await completeChat(
      'openrouter',
      apiKey,
      { messages, model, maxTokens: 120 },
      getStore,
    )
    const ms = Date.now() - t0
    const preview = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    console.log(`OK  [${label}] ${model} (${ms}ms): ${preview || '(empty)'}`)
    return true
  } catch (e) {
    console.log(`FAIL [${label}] ${model}: ${e.message || e}`)
    return false
  }
}

async function main() {
  console.log('provider entry:', providers.getEntry('openrouter').baseURL)
  console.log('vision support:', providers.supportsVision('openrouter'))

  const listed = await listRemoteModels('openrouter', getStore)
  console.log(`models sync: ok=${listed.ok} source=${listed.source} count=${listed.models?.length || 0}`)
  if (listed.error) console.log('models sync note:', listed.error)
  console.log('sample models:', (listed.models || []).slice(0, 8).join(', '))

  let textOk = 0
  let visionOk = 0
  for (const model of CANDIDATES) {
    if (!isMultimodalChatModel('openrouter', model)) {
      console.log(`SKIP ${model} (not multimodal allowlist)`)
      continue
    }
    const textPass = await tryModel(
      model,
      [
        { role: 'system', content: 'Reply in one short sentence.' },
        { role: 'user', content: 'Say hello and name one use of fast multimodal inference.' },
      ],
      'text',
    )
    if (textPass) textOk += 1

    const visionPass = await tryModel(
      model,
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe the image in 5 words or fewer. What dominant color do you see?',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${TINY_PNG_B64}` },
            },
          ],
        },
      ],
      'vision',
    )
    if (visionPass) visionOk += 1
  }

  console.log(`\nSummary: text_ok=${textOk} vision_ok=${visionOk} / ${CANDIDATES.length}`)
  if (textOk < 1 || visionOk < 1) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
