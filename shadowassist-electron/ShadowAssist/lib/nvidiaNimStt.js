// Copyright (c) 2026 VeilAssist. All rights reserved.
// NVIDIA Parakeet on NVCF — gRPC (integrate.api.nvidia.com REST does not serve ASR).

const path = require('path')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const NVCF_HOST = 'grpc.nvcf.nvidia.com:443'
/** build.nvidia.com — parakeet-1.1b-rnnt-multilingual-asr */
const DEFAULT_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

const PROTO_ROOT = path.join(__dirname, 'riva-protos')

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
async function transcribeWav({ wavBuffer, apiKey, languageCode = 'multi', functionId }) {
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
    } catch (_) {}
  }
}

module.exports = {
  transcribeWav,
  DEFAULT_FUNCTION_ID,
  NVCF_HOST,
}
