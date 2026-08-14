/**
 * LLM provider contract for interviewer turns and evaluation.
 *
 * Default target is a free/open-source model served over an OpenAI-compatible
 * endpoint (e.g. NVIDIA NIM); an Anthropic adapter is provided for parity.
 * Concrete implementations arrive in Milestone 3 (interviewer) and Milestone 4
 * (evaluator). This file pins the shared streaming contract only.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmStreamOptions {
  system: string
  messages: LlmMessage[]
  maxTokens: number
  temperature?: number
  /** Abort signal so a dropped session can cancel an in-flight generation. */
  signal?: AbortSignal
}

/** Streams model output token-by-token so callers can start TTS on sentence 1. */
export interface LlmProvider {
  readonly name: string
  stream(options: LlmStreamOptions): AsyncIterable<string>
}
