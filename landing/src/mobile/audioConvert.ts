/** Convert recorded webm/opus blob to 16 kHz mono WAV for ASR vendors. */
export async function blobToWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  try {
    const buffer = await blob.arrayBuffer()
    const decoded = await ctx.decodeAudioData(buffer.slice(0))
    const targetRate = 16000
    const duration = decoded.duration
    const offline = new OfflineAudioContext(1, Math.ceil(duration * targetRate), targetRate)
    const source = offline.createBufferSource()
    const mono = offline.createBuffer(1, decoded.length, decoded.sampleRate)
    mono.copyToChannel(decoded.getChannelData(0), 0)
    source.buffer = mono
    source.connect(offline.destination)
    source.start(0)
    const rendered = await offline.startRendering()
    const pcm = rendered.getChannelData(0)
    const samples = new Int16Array(pcm.length)
    for (let i = 0; i < pcm.length; i += 1) {
      const s = Math.max(-1, Math.min(1, pcm[i]))
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    const wav = encodeWav(samples, targetRate)
    return new Blob([wav], { type: 'audio/wav' })
  } finally {
    await ctx.close()
  }
}

function encodeWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(offset, samples[i], true)
    offset += 2
  }
  return buffer
}
