export type ModelCapabilities = {
  provider: 'nvidia' | 'groq'
  model: string
  multimodal: boolean
  camera_input: boolean
  reasoning: boolean
  temperature: boolean
  top_p: boolean
  streaming: boolean
  max_context?: number
  max_output?: number
}

const NVIDIA_VISION = /vl|vision|nemotron-3-nano-omni|llama-4-(scout|maverick)|llama-3\.2-11b-vision/i
const NVIDIA_REASONING = /nemotron|omni|reason/i
const GROQ_VISION = /qwen3\.6-27b|qwen\/qwen3\.6|llama-4-(scout|maverick)|vision/i
const GROQ_REASONING = /qwen3\.6|reason/i

export function capabilitiesFor(provider: 'nvidia' | 'groq', model: string): ModelCapabilities {
  const multimodal =
    provider === 'nvidia' ? NVIDIA_VISION.test(model) : GROQ_VISION.test(model)
  const reasoning =
    provider === 'nvidia' ? NVIDIA_REASONING.test(model) : GROQ_REASONING.test(model)
  return {
    provider,
    model,
    multimodal,
    camera_input: multimodal,
    reasoning,
    temperature: true,
    top_p: true,
    streaming: true,
  }
}

export function canServeRequest(
  caps: ModelCapabilities,
  opts: { image?: boolean; thinking?: boolean },
): { ok: boolean; skip: boolean } {
  if (opts.image && !caps.multimodal) return { ok: false, skip: true }
  if (opts.thinking && !caps.reasoning) return { ok: true, skip: false }
  return { ok: true, skip: false }
}
