import { handleCorsPreflight } from './_cors.js'
import { transcribeWavGrpc } from '../nvidia-parakeet-grpc.js'

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
    const rawLanguage = String(body.language || 'multi').trim()
    const language =
      rawLanguage === 'en' || rawLanguage === 'en-US' ? 'multi' : rawLanguage
    const functionId = String(body.functionId || DEFAULT_FUNCTION_ID).trim()

    const text = await transcribeWavGrpc({
      wavBuffer: audioBuf,
      apiKey,
      languageCode: language,
      functionId,
    })

    res.status(200).json({ text })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Transcription failed' })
  }
}
