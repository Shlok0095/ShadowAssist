/** NVIDIA NIM chat models — aligned with desktop lib/nvidiaChatModels.cjs */

export const DEFAULT_NVIDIA_CHAT_MODEL = 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1'

/** Fast multimodal models on integrate.api.nvidia.com (bench-ranked). */
export const NVIDIA_VISION_CATALOG_MODELS = [
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
  'nvidia/nemotron-nano-12b-v2-vl',
  'meta/llama-3.2-11b-vision-instruct',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'meta/llama-4-scout-17b-16e-instruct',
]

export const NVIDIA_VISION_FALLBACK_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl',
  'meta/llama-3.2-11b-vision-instruct',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'meta/llama-4-scout-17b-16e-instruct',
]

export function nvidiaFallbackModelsFor(primaryModel: string): string[] {
  const primary = String(primaryModel || '').trim().toLowerCase()
  return NVIDIA_VISION_FALLBACK_MODELS.filter((id) => id.toLowerCase() !== primary)
}

export function nvidiaVisionModelsFor(primaryModel: string): string[] {
  const primary = String(primaryModel || '').trim()
  const vision = NVIDIA_VISION_CATALOG_MODELS.filter((id) => /vl|vision|omni|scout/i.test(id))
  const ordered = [primary, ...vision.filter((id) => id.toLowerCase() !== primary.toLowerCase())]
  return ordered.filter((id) => /vl|vision|omni|scout/i.test(id))
}

export function isNvidiaVisionModel(model: string): boolean {
  return /vl|vision|nemotron-3-nano-omni|llama-4-scout/i.test(String(model || ''))
}

/** Desktop fast-path: Nemotron + common NIM VLMs with no-think inference. */
export function isNvidiaFastChatModel(model: string): boolean {
  return /nemotron-nano-vl|nemotron-nano-12b|nemotron-3-nano-omni|llama-4-(scout|maverick)|llama-3\.2-11b-vision|llama-3\.1-nemotron/i.test(
    String(model || ''),
  )
}
