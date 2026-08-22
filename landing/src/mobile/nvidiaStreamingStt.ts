import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import type { AppSettings } from './profileTypes'
import { float32ToLinear16, resampleF32 } from './pcmStreamCapture'
import { getSttApiKey, nvidiaLanguageCode, NVIDIA_NIM_FUNCTION_ID } from './sttRegistry'

const TARGET_RATE = 16000
const MIN_SEND_BYTES = 5120

export type NvidiaStreamingCallbacks = {
  onInterim: (text: string) => void
  onUtterance: (text: string) => void
  onError?: (message: string) => void
}

export type NvidiaStreamingHandle = {
  stop: () => void
  sendPcm: (samples: Float32Array, sampleRate: number) => void
}

type NvidiaParakeetNative = {
  startStreaming(options: {
    apiKey: string
    languageCode?: string
    functionId?: string
  }): Promise<void>
  sendStreamingPcm(options: { data: string }): Promise<void>
  stopStreaming(): Promise<void>
  addListener(
    event: 'transcript' | 'streamError' | 'streamEnd',
    handler: (data: Record<string, unknown>) => void,
  ): Promise<PluginListenerHandle>
}

const NvidiaParakeet = registerPlugin<NvidiaParakeetNative>('NvidiaParakeet')

export function nvidiaStreamingAvailable(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export function connectNvidiaStreaming(
  settings: AppSettings,
  callbacks: NvidiaStreamingCallbacks,
): Promise<NvidiaStreamingHandle> {
  const apiKey = getSttApiKey(settings, 'nvidia')
  if (!apiKey) throw new Error('Add NVIDIA API key in Audio → NVIDIA Parakeet.')

  let stopped = false
  const pending: Int16Array[] = []
  let pendingBytes = 0
  const listeners: PluginListenerHandle[] = []

  const cleanup = async () => {
    for (const h of listeners) await h.remove()
    listeners.length = 0
    try {
      await NvidiaParakeet.stopStreaming()
    } catch {
      /* ignore */
    }
  }

  const flushSend = () => {
    if (stopped || !pending.length) return
    const total = pending.reduce((n, p) => n + p.length, 0)
    const merged = new Int16Array(total)
    let offset = 0
    for (const chunk of pending) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    pending.length = 0
    pendingBytes = 0
    const bytes = new Uint8Array(merged.buffer, merged.byteOffset, merged.byteLength)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
    void NvidiaParakeet.sendStreamingPcm({ data: btoa(binary) })
  }

  return new Promise((resolve, reject) => {
    void NvidiaParakeet.addListener('transcript', (data) => {
      const text = String(data?.text || '').trim()
      const isFinal = Boolean(data?.isFinal)
      if (!text) return
      if (isFinal) {
        callbacks.onUtterance(text)
      } else {
        callbacks.onInterim(text)
      }
    }).then((h) => listeners.push(h))

    void NvidiaParakeet.addListener('streamError', (data) => {
      const msg = String(data?.message || 'NVIDIA streaming error')
      callbacks.onError?.(msg)
    }).then((h) => listeners.push(h))

    void NvidiaParakeet.startStreaming({
      apiKey,
      languageCode: nvidiaLanguageCode(settings.micListenLanguage),
      functionId: settings.nvidiaNimFunctionId?.trim() || NVIDIA_NIM_FUNCTION_ID,
    })
      .then(() => {
        resolve({
          stop: () => {
            stopped = true
            void cleanup()
          },
          sendPcm: (samples, sampleRate) => {
            if (stopped) return
            const f32 =
              sampleRate === TARGET_RATE ? samples : resampleF32(samples, sampleRate, TARGET_RATE)
            const lin = float32ToLinear16(f32)
            pending.push(lin)
            pendingBytes += lin.byteLength
            if (pendingBytes >= MIN_SEND_BYTES) flushSend()
          },
        })
      })
      .catch((err) =>
        reject(err instanceof Error ? err : new Error(String(err || 'NVIDIA streaming failed'))),
      )
  })
}
