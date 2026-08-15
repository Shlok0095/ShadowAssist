import type { AppSettings } from './profileTypes'
import { blobToWav16k } from './audioConvert'
import {
  deepgramQueryParams,
  getSttApiKey,
  getSttModel,
  nvidiaLanguageCode,
  NVIDIA_NIM_FUNCTION_ID,
  whisperLangParams,
} from './sttRegistry'

const TRANSCRIBE_PROXY =
  import.meta.env.VITE_API_ORIGIN
    ? `${String(import.meta.env.VITE_API_ORIGIN).replace(/\/$/, '')}/api/interview/transcribe`
    : import.meta.env.VITE_MOBILE_APK
      ? 'https://veilassist.vercel.app/api/interview/transcribe'
      : '/api/interview/transcribe'

async function parseTranscriptResponse(res: Response): Promise<string> {
  const text = await res.text()
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${text.slice(0, 200)}`)
  try {
    const json = JSON.parse(text)
    return String(json.text || json.transcript || '').trim()
  } catch {
    return text.trim()
  }
}

async function transcribeNvidiaProxy(settings: AppSettings, wavBlob: Blob, apiKey: string): Promise<string> {
  const arr = new Uint8Array(await wavBlob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i])
  const audioBase64 = btoa(binary)
  const functionId = settings.nvidiaNimFunctionId?.trim() || NVIDIA_NIM_FUNCTION_ID

  const proxyRes = await fetch(TRANSCRIBE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'nvidia',
      apiKey,
      model: getSttModel(settings),
      language: nvidiaLanguageCode(settings.micListenLanguage),
      functionId,
      audioBase64,
    }),
  })
  return await parseTranscriptResponse(proxyRes)
}

async function transcribeNvidia(settings: AppSettings, wavBlob: Blob): Promise<string> {
  const apiKey = getSttApiKey(settings, 'nvidia')
  if (!apiKey) throw new Error('Add NVIDIA API key in Audio → NVIDIA Parakeet.')

  // Parakeet ASR uses NVCF — not the generic OpenAI REST route on integrate.api.nvidia.com.
  if (import.meta.env.VITE_MOBILE_APK) {
    return transcribeNvidiaProxy(settings, wavBlob, apiKey)
  }

  const form = new FormData()
  form.append('file', wavBlob, 'audio.wav')
  form.append('model', getSttModel(settings))
  form.append('language', nvidiaLanguageCode(settings.micListenLanguage))
  form.append('response_format', 'json')

  const functionId = settings.nvidiaNimFunctionId?.trim() || NVIDIA_NIM_FUNCTION_ID

  const res = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'NVCF-Function-Id': functionId,
    },
    body: form,
  })

  if (res.ok) return await parseTranscriptResponse(res)
  return transcribeNvidiaProxy(settings, wavBlob, apiKey)
}

async function transcribeDeepgram(settings: AppSettings, audioBlob: Blob): Promise<string> {
  const apiKey = getSttApiKey(settings, 'deepgram')
  if (!apiKey) throw new Error('Add Deepgram API key in Audio → Deepgram.')

  const params = deepgramQueryParams(settings)
  const contentType = audioBlob.type || 'audio/wav'
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': contentType,
    },
    body: audioBlob,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Deepgram failed (${res.status}): ${text.slice(0, 200)}`)
  const json = JSON.parse(text)
  return String(json?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '').trim()
}

async function transcribeWhisper(
  settings: AppSettings,
  blob: Blob,
  base: string,
  provider: 'groq' | 'openai',
): Promise<string> {
  const apiKey = getSttApiKey(settings, provider)
  if (!apiKey) throw new Error(`Add ${provider === 'groq' ? 'Groq' : 'OpenAI'} API key.`)

  const lang = whisperLangParams(settings.micListenLanguage)
  const form = new FormData()
  form.append('file', blob, provider === 'groq' ? 'audio.webm' : 'audio.wav')
  form.append('model', getSttModel(settings))
  form.append('temperature', '0')
  form.append('response_format', 'json')
  if (lang.language) form.append('language', lang.language)
  if (lang.prompt) form.append('prompt', lang.prompt)

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  return await parseTranscriptResponse(res)
}

export async function transcribeAudioBlob(settings: AppSettings, blob: Blob): Promise<string> {
  const provider = settings.sttProvider

  if (provider === 'groq') {
    return transcribeWhisper(settings, blob, 'https://api.groq.com/openai/v1', 'groq')
  }
  if (provider === 'openai') {
    const wav = await blobToWav16k(blob)
    return transcribeWhisper(settings, wav, 'https://api.openai.com/v1', 'openai')
  }
  if (provider === 'deepgram') {
    const audio =
      blob.type.includes('webm') || blob.type.includes('ogg') ? blob : await blobToWav16k(blob)
    return transcribeDeepgram(settings, audio)
  }

  const wav = await blobToWav16k(blob)
  if (provider === 'nvidia') return transcribeNvidia(settings, wav)

  throw new Error('Unknown STT provider')
}
