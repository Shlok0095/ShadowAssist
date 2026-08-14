import 'server-only'

import { nimSchema } from '@/lib/env.schema'

import type { LlmProvider } from './llm'
import { NimLlmProvider } from './nim'

/**
 * Server-only provider factory. Resolves the configured LLM provider from env.
 * Default (and currently only) provider is NVIDIA NIM — the free/open-source,
 * OpenAI-compatible model path. Additional providers (e.g. Anthropic) can be
 * selected here later without changing any caller.
 */
let cachedLlm: LlmProvider | null = null

export function getLlmProvider(): LlmProvider {
  if (cachedLlm) return cachedLlm

  const env = nimSchema.parse({
    NVIDIA_NIM_API_KEY: process.env.NVIDIA_NIM_API_KEY,
    NIM_LLM_BASE_URL: process.env.NIM_LLM_BASE_URL,
    NIM_LLM_MODEL: process.env.NIM_LLM_MODEL,
  })

  cachedLlm = new NimLlmProvider({
    apiKey: env.NVIDIA_NIM_API_KEY,
    baseUrl: env.NIM_LLM_BASE_URL,
    model: env.NIM_LLM_MODEL,
  })
  return cachedLlm
}
