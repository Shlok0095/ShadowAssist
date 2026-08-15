/** Incremental OpenAI-compatible SSE parser (shared by fetch + XHR streaming). */
export function createOpenAiSseParser(onDelta: (text: string) => void) {
  let buffer = ''
  let full = ''

  const processLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed === 'data: [DONE]') return
    if (!trimmed.startsWith('data:')) return
    const json = trimmed.replace(/^data:\s*/, '')
    if (json === '[DONE]') return
    try {
      const parsed = JSON.parse(json) as {
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>
      }
      const delta =
        parsed.choices?.[0]?.delta?.content ??
        parsed.choices?.[0]?.message?.content ??
        ''
      if (delta) {
        full += delta
        onDelta(delta)
      }
    } catch {
      /* partial SSE line */
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) processLine(line)
    },
    finish() {
      if (buffer.trim()) processLine(buffer)
      return full.trim()
    },
  }
}

/** Parse OpenAI-compatible SSE chunks from a chat completion stream. */
export async function readOpenAiChatStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createOpenAiSseParser(onDelta)

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
    }
  } finally {
    reader.releaseLock()
  }

  return parser.finish()
}

/**
 * XHR SSE streaming — works on Android WebView with incremental responseText.
 * Use on native instead of fetch when CapacitorHttp must stay disabled (fetch patch buffers whole body).
 */
export function streamOpenAiChatViaXhr(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = createOpenAiSseParser(onDelta)
    const xhr = new XMLHttpRequest()
    let lastLen = 0
    let pollId: ReturnType<typeof setInterval> | undefined

    const cleanup = () => {
      if (pollId) clearInterval(pollId)
      signal?.removeEventListener('abort', onAbort)
    }

    const fail = (err: Error) => {
      cleanup()
      reject(err)
    }

    const drain = () => {
      const text = xhr.responseText
      if (text.length <= lastLen) return
      parser.push(text.slice(lastLen))
      lastLen = text.length
    }

    const onAbort = () => {
      xhr.abort()
      fail(new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', onAbort)

    xhr.open('POST', url, true)
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'content-type') continue
      xhr.setRequestHeader(key, value)
    }
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Accept', 'text/event-stream')

    xhr.onprogress = drain
    pollId = setInterval(drain, 40)
    xhr.timeout = 0

    xhr.onload = () => {
      drain()
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parser.finish())
      } else {
        reject(new Error(`AI provider error (${xhr.status}): ${xhr.responseText.slice(0, 300)}`))
      }
    }
    xhr.onerror = () => fail(new Error('Network error during stream'))
    xhr.onabort = () => fail(new DOMException('Aborted', 'AbortError'))

    xhr.send(JSON.stringify(body))
  })
}
