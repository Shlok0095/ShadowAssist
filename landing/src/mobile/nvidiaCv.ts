import type { AppSettings } from './profileTypes'

/** NVIDIA NIM key + model dedicated to resume/CV extraction (independent of interview chat provider). */
/** 128k context — nemotron-mini-4b-instruct only supports 4096 tokens total. */
export const NVIDIA_CV_MODEL = 'meta/llama-3.1-8b-instruct'
export const NVIDIA_CV_BASE = 'https://integrate.api.nvidia.com/v1'
export const NVIDIA_CV_MAX_OUTPUT_TOKENS = 2500

export type NvidiaCvCredentials = {
  apiKey: string
  model: string
  baseUrl: string
}

/** Resume upload always uses nvidiaKey when set — user may use Groq/etc. for interview answers. */
export function resolveNvidiaCvCredentials(settings: AppSettings): NvidiaCvCredentials | null {
  const apiKey = settings.nvidiaKey.trim()
  if (!apiKey) return null
  return {
    apiKey,
    model: NVIDIA_CV_MODEL,
    baseUrl: NVIDIA_CV_BASE,
  }
}

export function nvidiaCvKeyConfigured(settings: AppSettings): boolean {
  return settings.nvidiaKey.trim().length > 0
}
