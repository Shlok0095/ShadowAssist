import type { LlmProvider, LlmStreamOptions } from './llm'

/**
 * NVIDIA NIM LLM adapter (OpenAI-compatible chat completions with SSE streaming).
 *
 * This is the app's default, free/open-source model path. It takes its API key
 * by constructor injection — it never reads process.env itself — so the key
 * stays confined to the server-only factory in `./index.ts`. The browser never
 * receives it.
 */
export interface NimConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export class NimLlmProvider implements LlmProvider {
  readonly name = 'nvidia-nim'

  constructor(private readonly config: NimConfig) {}

  async *stream(options: LlmStreamOptions): AsyncIterable<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: this.config.model,
        stream: true,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens,
        messages: [{ role: 'system', content: options.system }, ...options.messages],
      }),
      signal: options.signal,
    })

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`NIM chat failed (${res.status}): ${detail.slice(0, 500)}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by newlines; keep the trailing partial line.
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta: string | undefined = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Keepalive or non-JSON frame — ignore.
        }
      }
    }
  }
}
