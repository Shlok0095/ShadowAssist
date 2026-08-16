import { FALLBACK_RANK } from './generated/fallbackRank.generated'

const NAMES: Record<string, string> = {
  'nvidia/nemotron-nano-12b-v2-vl': 'Nemotron Nano 12B VL',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning': 'Nemotron 3 Nano Omni',
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': 'Nemotron Nano VL 8B',
  'meta/llama-3.2-11b-vision-instruct': 'Llama 3.2 11B Vision',
  'qwen/qwen3.6-27b': 'Qwen 3.6 27B',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'meta/llama-3.1-8b-instruct': 'Llama 3.1 8B',
  'nvidia/nemotron-mini-4b-instruct': 'Nemotron Mini 4B',
}

export type LabeledModel = { value: string; label: string }

export function modelShortName(id: string): string {
  if (NAMES[id]) return NAMES[id]
  const tail = String(id || '').split('/').pop() || id
  return tail.replace(/-/g, ' ')
}

export function nvidiaModelOptions(): LabeledModel[] {
  const primary = FALLBACK_RANK.primary_nvidia
  const fallbacks = FALLBACK_RANK.nvidia_fallbacks
  const ranked = [primary, ...fallbacks].filter(Boolean)
  const extras = ['meta/llama-3.2-11b-vision-instruct']
  const seen = new Set<string>()
  const out: LabeledModel[] = []
  for (const id of ranked) {
    if (seen.has(id)) continue
    seen.add(id)
    const role =
      id === primary ? 'Primary' : `Fallback ${fallbacks.indexOf(id) + 1}`
    out.push({ value: id, label: `${role} · ${modelShortName(id)}` })
  }
  for (const id of extras) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ value: id, label: `${modelShortName(id)} · slower` })
  }
  return out
}

export function groqModelOptions(): LabeledModel[] {
  return [
    { value: FALLBACK_RANK.groq_primary || 'qwen/qwen3.6-27b', label: 'Camera · Qwen 3.6 27B' },
    { value: 'llama-3.3-70b-versatile', label: 'Text only · Llama 3.3 70B' },
  ]
}

export function nvidiaFallbackHint(): string {
  const names = [
    modelShortName(FALLBACK_RANK.primary_nvidia),
    ...FALLBACK_RANK.nvidia_fallbacks.map(modelShortName),
    FALLBACK_RANK.groq_primary ? modelShortName(FALLBACK_RANK.groq_primary) : '',
  ].filter(Boolean)
  return `If a model fails, the app tries the next one silently: ${names.join(' → ')}. An error appears only if every model fails.`
}

export function formatCheckedModelsError(models: string[]): string {
  const names = [...new Set(models.filter(Boolean).map(modelShortName))]
  if (!names.length) return 'No models could answer. Add NVIDIA and Groq keys in Settings.'
  return `Checked ${names.join(', ')}. None could answer.`
}
