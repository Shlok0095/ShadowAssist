import { float32ToWavBlob } from './audioConvert'

const SAMPLE_RATE = 16000

/** Capture mic as 16 kHz mono WAV chunks (avoids corrupt WebM timeslice fragments on Android). */
export function startPcmWavCapture(
  stream: MediaStream,
  chunkMs: number,
  onChunk: (wav: Blob) => void,
): { stop: () => void } {
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const buffers: Float32Array[] = []
  let pendingSamples = 0
  const chunkSamples = Math.max(1, Math.round((chunkMs / 1000) * SAMPLE_RATE))
  let stopped = false

  const flushChunk = () => {
    if (pendingSamples < Math.min(chunkSamples, SAMPLE_RATE / 2)) return
    const take = Math.min(pendingSamples, chunkSamples)
    const merged = new Float32Array(take)
    let offset = 0
    while (offset < take && buffers.length > 0) {
      const head = buffers[0]
      const need = take - offset
      if (head.length <= need) {
        merged.set(head, offset)
        offset += head.length
        buffers.shift()
      } else {
        merged.set(head.subarray(0, need), offset)
        buffers[0] = head.subarray(need)
        offset += need
      }
    }
    pendingSamples -= take
    const rate = ctx.sampleRate
    if (rate === SAMPLE_RATE) {
      onChunk(float32ToWavBlob(merged, SAMPLE_RATE))
      return
    }
    const offline = new OfflineAudioContext(1, Math.ceil((merged.length / rate) * SAMPLE_RATE), SAMPLE_RATE)
    const buf = offline.createBuffer(1, merged.length, rate)
    buf.copyToChannel(merged, 0)
    const src = offline.createBufferSource()
    src.buffer = buf
    src.connect(offline.destination)
    src.start(0)
    offline.startRendering().then((rendered) => {
      if (!stopped) onChunk(float32ToWavBlob(rendered.getChannelData(0), SAMPLE_RATE))
    })
  }

  processor.onaudioprocess = (event) => {
    if (stopped) return
    const input = event.inputBuffer.getChannelData(0)
    buffers.push(new Float32Array(input))
    pendingSamples += input.length
    if (pendingSamples >= chunkSamples) flushChunk()
  }

  source.connect(processor)
  processor.connect(ctx.destination)

  return {
    stop: () => {
      stopped = true
      processor.onaudioprocess = null
      processor.disconnect()
      source.disconnect()
      void ctx.close()
    },
  }
}
