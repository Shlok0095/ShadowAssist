import { afterEach, describe, expect, it, vi } from 'vitest'

import { NimLlmProvider } from '@/lib/providers/nim'

/** Build a Response whose body streams the given string chunks as bytes. */
function sseResponse(chunks: string[], init?: ResponseInit): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, ...init })
}

async function collect(iter: AsyncIterable<string>): Promise<string> {
  let out = ''
  for await (const t of iter) out += t
  return out
}

const provider = new NimLlmProvider({
  apiKey: 'test-key',
  baseUrl: 'https://nim.test/v1',
  model: 'meta/llama-3.3-70b-instruct',
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NimLlmProvider.stream', () => {
  it('concatenates streamed deltas and stops at [DONE]', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Tell "}}]}\n',
        'data: {"choices":[{"delta":{"content":"me about "}}]}\n',
        'data: {"choices":[{"delta":{"content":"a conflict."}}]}\n',
        'data: [DONE]\n',
        'data: {"choices":[{"delta":{"content":"IGNORED"}}]}\n',
      ]),
    )
    const text = await collect(provider.stream({ system: 's', messages: [], maxTokens: 64 }))
    expect(text).toBe('Tell me about a conflict.')
  })

  it('handles deltas split across network chunk boundaries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hel',
        'lo"}}]}\ndata: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: [DONE]\n',
      ]),
    )
    const text = await collect(provider.stream({ system: 's', messages: [], maxTokens: 64 }))
    expect(text).toBe('Hello world')
  })

  it('ignores keepalive/non-JSON frames', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        ': keepalive\n',
        'data: {"choices":[{"delta":{"content":"A"}}]}\n',
        'data: \n',
        'data: {"choices":[{"delta":{}}]}\n',
        'data: {"choices":[{"delta":{"content":"B"}}]}\n',
        'data: [DONE]\n',
      ]),
    )
    const text = await collect(provider.stream({ system: 's', messages: [], maxTokens: 64 }))
    expect(text).toBe('AB')
  })

  it('throws a descriptive error on non-200 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unauthorized', { status: 401 }),
    )
    await expect(
      collect(provider.stream({ system: 's', messages: [], maxTokens: 64 })),
    ).rejects.toThrow(/NIM chat failed \(401\)/)
  })
})
