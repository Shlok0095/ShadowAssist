// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * NVIDIA Parakeet / Riva ASR via NVCF gRPC (build.nvidia.com hosted NIM).
 * @see https://build.nvidia.com/nvidia/parakeet-1_1b-rnnt-multilingual-asr/api
 */

const path = require('path')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const NVCF_HOST = 'grpc.nvcf.nvidia.com:443'

/** parakeet-1.1b-rnnt-multilingual-asr on build.nvidia.com */
const DEFAULT_FUNCTION_ID = '71203149-d3b7-4460-8231-1be2543a1fca'

let RivaSpeechRecognition = null

function getService() {
  if (RivaSpeechRecognition) return RivaSpeechRecognition
  const protoRoot = path.join(__dirname, 'riva-protos')
  const def = protoLoader.loadSync(path.join(protoRoot, 'riva/proto/riva_asr.proto'), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoRoot],
  })
  const pkg = grpc.loadPackageDefinition(def)
  RivaSpeechRecognition = pkg.nvidia.riva.asr.RivaSpeechRecognition
  return RivaSpeechRecognition
}

/**
 * @param {{ apiKey: string, functionId?: string, pcm: Buffer, sampleRateHertz?: number, languageCode?: string }} opts
 * @returns {Promise<string>}
 */
function transcribeLinearPcm(opts) {
  const {
    apiKey,
    functionId = DEFAULT_FUNCTION_ID,
    pcm,
    sampleRateHertz = 16000,
    languageCode = 'multi',
  } = opts
  if (!apiKey || !pcm?.length) return Promise.resolve('')

  const Service = getService()
  const metadata = new grpc.Metadata()
  metadata.add('function-id', functionId)
  metadata.add('authorization', `Bearer ${apiKey}`)

  const client = new Service(NVCF_HOST, grpc.credentials.createSsl())

  return new Promise((resolve, reject) => {
    client.Recognize(
      {
        config: {
          encoding: 'LINEAR_PCM',
          sampleRateHertz,
          languageCode,
          maxAlternatives: 1,
          enableAutomaticPunctuation: true,
          audioChannelCount: 1,
        },
        audio: pcm,
      },
      metadata,
      (err, response) => {
        try {
          client.close()
        } catch {
          /* ignore */
        }
        if (err) return reject(err)
        const text = response?.results?.[0]?.alternatives?.[0]?.transcript || ''
        resolve(String(text).trim())
      }
    )
  })
}

module.exports = {
  transcribeLinearPcm,
  DEFAULT_FUNCTION_ID,
  NVCF_HOST,
}
