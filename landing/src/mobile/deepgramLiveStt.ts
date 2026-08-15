import type { AppSettings } from './profileTypes'
import { float32ToLinear16, resampleF32 } from './pcmStreamCapture'
import { deepgramLiveQueryParams, getSttApiKey } from './sttRegistry'

const TARGET_RATE = 16000
const MIN_SEND_BYTES = 3200

export type DeepgramLiveCallbacks = {
  onInterim: (text: string) => void
  onUtterance: (text: string) => void
  onError: (message: string) => void
}

export type DeepgramLiveHandle = {
  stop: () => void
  sendPcm: (samples: Float32Array, sampleRate: number) => void
}

export function connectDeepgramLive(
  settings: AppSettings,
  callbacks: DeepgramLiveCallbacks,
): Promise<DeepgramLiveHandle> {
  const apiKey = getSttApiKey(settings, 'deepgram')
  if (!apiKey) throw new Error('Add Deepgram API key in Audio → Deepgram.')

  const params = deepgramLiveQueryParams(settings)
  const url = `wss://api.deepgram.com/v1/listen?${params}`

  let ws: WebSocket
  let stopped = false
  let utteranceParts: string[] = []
  let lastInterim = ''
  const pending: Int16Array[] = []
  let pendingBytes = 0
  let keepalive: ReturnType<typeof setInterval> | null = null

  const flushSend = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !pending.length) return
    const total = pending.reduce((n, p) => n + p.length, 0)
    const merged = new Int16Array(total)
    let offset = 0
    for (const chunk of pending) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    pending.length = 0
    pendingBytes = 0
    ws.send(merged.buffer)
  }

  const finalizeUtterance = (fallback?: string) => {
    const joined = utteranceParts.join(' ').trim()
    const text = joined || String(fallback || '').trim()
    utteranceParts = []
    lastInterim = ''
    if (text) callbacks.onUtterance(text)
  }

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url, ['token', apiKey])
    } catch (e) {
      reject(e instanceof Error ? e : new Error('WebSocket failed'))
      return
    }

    ws.onopen = () => {
      keepalive = setInterval(() => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        } catch {
          /* ignore */
        }
      }, 8000)

      resolve({
        stop: () => {
          stopped = true
          if (keepalive) clearInterval(keepalive)
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'CloseStream' }))
            }
            ws.close()
          } catch {
            /* ignore */
          }
        },
        sendPcm: (samples, sampleRate) => {
          if (stopped || ws.readyState !== WebSocket.OPEN) return
          const f32 =
            sampleRate === TARGET_RATE ? samples : resampleF32(samples, sampleRate, TARGET_RATE)
          const lin = float32ToLinear16(f32)
          pending.push(lin)
          pendingBytes += lin.byteLength
          if (pendingBytes >= MIN_SEND_BYTES) flushSend()
        },
      })
    }

    ws.onerror = () => {
      callbacks.onError('Deepgram connection error')
      reject(new Error('Deepgram WebSocket error'))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data || '{}'))
        if (msg.type === 'UtteranceEnd') {
          finalizeUtterance(lastInterim)
          return
        }
        const alt = msg?.channel?.alternatives?.[0]
        const text = String(alt?.transcript || '').trim()
        if (!text) return

        if (msg.is_final) {
          utteranceParts.push(text)
          lastInterim = ''
          callbacks.onInterim(utteranceParts.join(' ').trim())
          if (msg.speech_final) finalizeUtterance()
        } else {
          lastInterim = text
          callbacks.onInterim([...utteranceParts, text].join(' ').trim())
        }
      } catch {
        /* ignore malformed */
      }
    }

    ws.onclose = () => {
      if (keepalive) clearInterval(keepalive)
    }
  })
}
