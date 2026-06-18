// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const OpenAI = require('openai')
const providers = require('./providers')

const openaiClientCache = {}

function openaiNativeHostname(baseURL) {
  try {
    const u = new URL(String(baseURL || 'https://api.openai.com/v1').replace(/\/$/, ''))
    return u.hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** Only api.openai.com — Groq/NIM/etc. still expect max_tokens. */
function isOpenAINativeApi(baseURL) {
  return openaiNativeHostname(baseURL) === 'api.openai.com'
}

/**
 * Chat Completions on OpenAI: newer GPT / o-series reject max_tokens and require max_completion_tokens.
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
function openaiModelUsesMaxCompletionTokens(modelId) {
  const m = String(modelId || '').toLowerCase().trim()
  if (!m) return false
  if (/^o[0-9]/.test(m)) return true
  if (m.startsWith('gpt-5')) return true
  if (m.startsWith('gpt-4.1') || m.startsWith('gpt-4.5')) return true
  if (m.startsWith('gpt-4o')) return true
  if (m.startsWith('chatgpt-4o')) return true
  return false
}

function chatCompletionTokenParams(maxTokens, baseURL, model) {
  if (isOpenAINativeApi(baseURL) && openaiModelUsesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxTokens }
  }
  return { max_tokens: maxTokens }
}

function getOpenAICompatClient(apiKey, baseURL) {
  const base = (baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const cacheKey = `${base}:${apiKey.slice(-12)}`
  if (!openaiClientCache[cacheKey]) {
    openaiClientCache[cacheKey] = new OpenAI({ apiKey, baseURL: base })
  }
  return openaiClientCache[cacheKey]
}

function convertContentForAnthropic(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content)
  const parts = content.map((p) => {
    if (!p) return null
    if (p.type === 'text') return { type: 'text', text: String(p.text || '') }
    if (p.type === 'image_url') {
      const url = String(p.image_url?.url || '')
      const m = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
      if (m) return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
    }
    return null
  }).filter(Boolean)
  if (parts.length === 0) return '[no content]'
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text
  return parts
}

function splitMessagesForAnthropic(messages) {
  let system = ''
  const out = []
  for (const m of messages) {
    if (m.role === 'system') {
      system += (typeof m.content === 'string' ? m.content : '') + '\n'
    } else if (m.role === 'user') {
      out.push({ role: 'user', content: convertContentForAnthropic(m.content) })
    } else if (m.role === 'assistant') {
      out.push({ role: 'assistant', content: typeof m.content === 'string' ? m.content : String(m.content) })
    }
  }
  return { system: system.trim(), messages: out.length ? out : [{ role: 'user', content: 'Hello' }] }
}

async function testConnection(provider, apiKey, getStore) {
  try {
    if (!apiKey) return { success: false, error: 'No API key provided' }
    if (providers.isAnthropic(provider)) {
      const AnthropicSdk = require('@anthropic-ai/sdk')
      const client = new AnthropicSdk({ apiKey })
      const testModel = providers.getTestModel(provider, getStore)
      await client.messages.create({
        model: testModel,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      return { success: true }
    }
    const baseURL = providers.resolveBaseURL(provider, getStore)
    const client = getOpenAICompatClient(apiKey, baseURL)
    const testModel = providers.getTestModel(provider, getStore)
    await client.chat.completions.create({
      model: testModel,
      messages: [{ role: 'user', content: 'Hi' }],
      ...chatCompletionTokenParams(5, baseURL, testModel),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Connection failed' }
  }
}

async function* streamChatAnthropic(apiKey, { messages, model, maxTokens = 1024, signal }) {
  const AnthropicSdk = require('@anthropic-ai/sdk')
  const client = new AnthropicSdk({ apiKey })
  const { system, messages: amsg } = splitMessagesForAnthropic(messages)
  const stream = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      messages: amsg,
      stream: true,
    },
    { signal }
  )
  for await (const event of stream) {
    if (signal?.aborted) return
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
      yield event.delta.text
    }
  }
}

async function* streamChatOpenAICompat(apiKey, baseURL, options) {
  const { messages, model = 'gpt-4o', maxTokens = 1024, signal } = options
  const client = getOpenAICompatClient(apiKey, baseURL)
  const stream = await client.chat.completions.create(
    { model, messages, stream: true, ...chatCompletionTokenParams(maxTokens, baseURL, model) },
    { signal }
  )
  for await (const chunk of stream) {
    if (signal?.aborted) return
    const token = chunk.choices[0]?.delta?.content || ''
    if (token) yield token
  }
}

async function* streamChat(provider, apiKey, options, getStore) {
  if (!apiKey) throw new Error('No API key')
  if (providers.isAnthropic(provider)) {
    yield* streamChatAnthropic(apiKey, options)
    return
  }
  const baseURL = providers.resolveBaseURL(provider, getStore)
  yield* streamChatOpenAICompat(apiKey, baseURL, options)
}

module.exports = {
  getOpenAICompatClient,
  testConnection,
  streamChat,
  streamChatOpenAICompat,
}
