// Natively inferenceConfig.ts — per-platform ONNX providers + dtype map.

/** @type {Record<string, string>} */
export const WHISPER_SAFE_DTYPE = {
  encoder_model: 'fp32',
  decoder_model: 'q8',
  decoder_model_merged: 'q8',
  decoder_with_past_model: 'q8',
}

/** @returns {{ executionProviders: string[], dtype: string | Record<string, string>, device: string }} */
export function resolveInferenceConfig() {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'darwin' && arch === 'arm64') {
    return { executionProviders: ['coreml', 'cpu'], dtype: 'fp32', device: 'cpu' }
  }
  if (platform === 'win32') {
    return { executionProviders: ['cpu'], dtype: WHISPER_SAFE_DTYPE, device: 'cpu' }
  }
  return { executionProviders: ['cpu'], dtype: WHISPER_SAFE_DTYPE, device: 'cpu' }
}

export function isMoonshineModel(modelId) {
  return /moonshine/i.test(String(modelId || ''))
}

/**
 * Natively whisperWorker.ts transcribe options (final + streaming partials).
 * @param {{ modelId: string, family?: string, partial?: boolean, gate?: boolean }} opts
 */
export function buildTranscribeOptions({ modelId, family, partial = false, gate = false }) {
  const moonshine = family === 'moonshine' || isMoonshineModel(modelId)

  if (moonshine) {
    const opts = {
      sampling_rate: 16000,
      language: 'english',
    }
    if (partial) opts.return_timestamps = false
    return opts
  }

  /** Natively LocalWhisperSTT whisper final + partial thresholds */
  /** @type {Record<string, unknown>} */
  const base = {
    sampling_rate: 16000,
    task: 'transcribe',
    condition_on_previous_text: false,
    compression_ratio_threshold: 2.4,
    no_speech_threshold: 0.6,
  }

  if (partial) {
    base.temperature = 0
    base.return_timestamps = false
  } else if (gate) {
    base.logprob_threshold = -0.85
    base.return_timestamps = true
  } else {
    base.logprob_threshold = -1.0
  }

  return base
}
