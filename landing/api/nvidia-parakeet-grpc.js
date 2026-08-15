// NVIDIA Parakeet ASR via NVCF gRPC (REST integrate.api.nvidia.com does not serve ASR).
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROTO_ROOT = path.join(__dirname, 'riva-protos')
const NVCF_HOST = 'grpc.nvcf.nvidia.com:443'
const DEFAULT_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

/** @type {Promise<import('@grpc/grpc-js').ServiceClientConstructor> | null} */
let serviceCtorPromise = null

function loadServiceCtor() {
  if (!serviceCtorPromise) {
    serviceCtorPromise = Promise.resolve().then(() => {
      const packageDefinition = protoLoader.loadSync(
        path.join(PROTO_ROOT, 'riva/proto/riva_asr.proto'),
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [PROTO_ROOT],
        },
      )
      const loaded = grpc.loadPackageDefinition(packageDefinition)
      const ctor = loaded?.nvidia?.riva?.asr?.RivaSpeechRecognition
      if (!ctor) throw new Error('Failed to load RivaSpeechRecognition gRPC service')
      return ctor
    })
  }
  return serviceCtorPromise
}

function pcmFromWav(wavBuffer) {
  const buf = Buffer.isBuffer(wavBuffer) ? wavBuffer : Buffer.from(wavBuffer)
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
    return {
      sampleRate: buf.readUInt32LE(24) || 16000,
      pcm: buf.subarray(44),
    }
  }
  return { sampleRate: 16000, pcm: buf }
}

/**
 * @param {object} opts
 * @param {Buffer} opts.wavBuffer
 * @param {string} opts.apiKey
 * @param {string} [opts.languageCode]
 * @param {string} [opts.functionId]
 */
export async function transcribeWavGrpc({
  wavBuffer,
  apiKey,
  languageCode = 'multi',
  functionId = DEFAULT_FUNCTION_ID,
}) {
  if (!apiKey) throw new Error('NVIDIA API key missing')
  if (!wavBuffer?.length) throw new Error('Empty audio buffer')

  const Service = await loadServiceCtor()
  const metadata = new grpc.Metadata()
  metadata.add('function-id', functionId || DEFAULT_FUNCTION_ID)
  metadata.add('authorization', `Bearer ${apiKey}`)

  const client = new Service(NVCF_HOST, grpc.credentials.createSsl())
  const { sampleRate, pcm } = pcmFromWav(wavBuffer)

  const request = {
    config: {
      encoding: 'LINEAR_PCM',
      sample_rate_hertz: sampleRate,
      language_code: languageCode || 'multi',
      max_alternatives: 1,
      enable_automatic_punctuation: true,
    },
    audio: pcm,
  }

  try {
    const response = await new Promise((resolve, reject) => {
      client.Recognize(request, metadata, (err, res) => {
        if (err) reject(err)
        else resolve(res)
      })
    })
    const text = response?.results?.[0]?.alternatives?.[0]?.transcript
    return String(text || '').trim()
  } finally {
    try {
      client.close()
    } catch {
      /* ignore */
    }
  }
}
