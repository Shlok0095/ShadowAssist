import type { AppSettings } from './profileTypes'
import { float32ToLinear16, resampleF32 } from './pcmStreamCapture'
import { deepgramLiveQueryParams, getSttApiKey } from './sttRegistry'

const TARGET_RATE = 16000
const MIN_SEND_BYTES = 3200
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_MS = 800

export type DeepgramLiveCallbacks = {
  onInterim: (text: string) => void
  onUtterance: (text: string) => void
  onError: (message: string) => void
  onReconnecting?: () => void
  onReconnected?: () => void
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

  let ws: WebSocket | null = null
  let stopped = false
  let reconnectAttempts = 0
  let utteranceParts: string[] = []
  let lastInterim = ''
  const pending: Int16Array[] = []
  let pendingBytes = 0
  let keepalive: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

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

  const onMessage = (event: MessageEvent) => {
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

  const cleanupWs = () => {
    if (keepalive) clearInterval(keepalive)
    keepalive = null
    ws = null
  }

  const scheduleReconnect = () => {
    if (stopped || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      callbacks.onError('Deepgram connection lost — tap New Question to retry')
      return
    }
    reconnectAttempts += 1
    callbacks.onReconnecting?.()
    const delay = RECONNECT_BASE_MS * 2 ** (reconnectAttempts - 1)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectSocket(false)
    }, delay)
  }

  const connectSocket = (isInitial: boolean) => {
    if (stopped) return

    try {
      ws = new WebSocket(url, ['token', apiKey])
    } catch {
      if (isInitial) throw new Error('WebSocket failed')
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      reconnectAttempts = 0
      callbacks.onReconnected?.()
      keepalive = setInterval(() => {
        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        } catch {
          /* ignore */
        }
      }, 8000)
      if (isInitial) initialResolve?.(handle)
    }

    ws.onerror = () => {
      if (isInitial && !initialResolved) {
        callbacks.onError('Deepgram connection error')
        initialReject?.(new Error('Deepgram WebSocket error'))
      } else if (!stopped) {
        callbacks.onError('Deepgram connection error')
      }
    }

    ws.onmessage = onMessage

    ws.onclose = () => {
      cleanupWs()
      if (!stopped) scheduleReconnect()
    }
  }

  let initialResolved = false
  let initialResolve: ((h: DeepgramLiveHandle) => void) | null = null
  let initialReject: ((e: Error) => void) | null = null

  const handle: DeepgramLiveHandle = {
    stop: () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'CloseStream' }))
          ws.close()
        }
      } catch {
        /* ignore */
      }
      cleanupWs()
    },
    sendPcm: (samples, sampleRate) => {
      if (stopped || !ws || ws.readyState !== WebSocket.OPEN) return
      const f32 =
        sampleRate === TARGET_RATE ? samples : resampleF32(samples, sampleRate, TARGET_RATE)
      const lin = float32ToLinear16(f32)
      pending.push(lin)
      pendingBytes += lin.byteLength
      if (pendingBytes >= MIN_SEND_BYTES) flushSend()
    },
  }

  return new Promise((resolve, reject) => {
    initialResolve = (h) => {
      if (!initialResolved) {
        initialResolved = true
        resolve(h)
      }
    }
    initialReject = (e) => {
      if (!initialResolved) {
        initialResolved = true
        reject(e)
      }
    }
    connectSocket(true)
  })
}
