// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const OpenAI = require('openai')
const providers = require('./providers')

const openaiClientCache = {}

function getOpenAICompatClient(apiKey, baseURL) {
  const base = (baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const cacheKey = `${base}:${apiKey.slice(-12)}`
  if (!openaiClientCache[cacheKey]) {
    openaiClientCache[cacheKey] = new OpenAI({ apiKey, baseURL: base })
  }
  return openaiClientCache[cacheKey]
}

function flattenUserContentForAnthropic(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const texts = content.filter((p) => p && p.type === 'text').map((p) => p.text || '')
    const t = texts.join('\n\n').trim()
    return t || '[Context includes non-text parts — describe screen/audio from text sections only.]'
  }
  return String(content)
}

function splitMessagesForAnthropic(messages) {
  let system = ''
  const out = []
  for (const m of messages) {
    if (m.role === 'system') {
      system += (typeof m.content === 'string' ? m.content : '') + '\n'
    } else if (m.role === 'user') {
      out.push({ role: 'user', content: flattenUserContentForAnthropic(m.content) })
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
      max_tokens: 5,
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
    { model, messages, max_tokens: maxTokens, stream: true },
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
