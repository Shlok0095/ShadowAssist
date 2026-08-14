import type { AppSettings } from './profileTypes'
import { getSttApiKey, getSttModel } from './providerRegistry'

const STT_BASE: Record<AppSettings['sttProvider'], string> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
}

export async function transcribeAudioBlob(
  settings: AppSettings,
  blob: Blob,
): Promise<string> {
  const apiKey = getSttApiKey(settings)
  if (!apiKey) throw new Error('Add a Groq or OpenAI API key for cloud transcription.')

  const model = getSttModel(settings)
  const base = STT_BASE[settings.sttProvider]
  const form = new FormData()
  form.append('file', blob, 'audio.webm')
  form.append('model', model)
  form.append('response_format', 'text')

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Transcription failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return text.trim()
}
