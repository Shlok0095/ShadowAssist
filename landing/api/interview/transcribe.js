import { handleCorsPreflight } from './_cors.js'

const DEFAULT_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const provider = String(body.provider || 'nvidia').toLowerCase()
    const apiKey = String(body.apiKey || '').trim()
    if (!apiKey) {
      res.status(400).json({ error: 'API key required' })
      return
    }

    if (provider !== 'nvidia') {
      res.status(400).json({ error: 'Proxy supports NVIDIA Parakeet only' })
      return
    }

    const audioBase64 = String(body.audioBase64 || '').trim()
    if (!audioBase64) {
      res.status(400).json({ error: 'Missing audioBase64' })
      return
    }

    const audioBuf = Buffer.from(audioBase64, 'base64')
    const model =
      String(body.model || '').trim() || 'nvidia/parakeet-1.1b-rnnt-multilingual-asr'
    const language = String(body.language || 'multi').trim()
    const functionId = String(body.functionId || DEFAULT_FUNCTION_ID).trim()

    const form = new FormData()
    form.append('file', new Blob([audioBuf], { type: 'audio/wav' }), 'audio.wav')
    form.append('model', model)
    form.append('language', language)
    form.append('response_format', 'json')

    const restRes = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'NVCF-Function-Id': functionId,
      },
      body: form,
    })

    const text = await restRes.text()
    if (restRes.ok) {
      try {
        const json = JSON.parse(text)
        res.status(200).json({ text: String(json.text || '').trim() })
      } catch {
        res.status(200).json({ text: text.trim() })
      }
      return
    }

    res.status(restRes.status).json({
      error: `NVIDIA transcription failed (${restRes.status})`,
      detail: text.slice(0, 300),
    })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Transcription failed' })
  }
}
