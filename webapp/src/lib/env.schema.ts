import { z } from 'zod'

/**
 * Pure env schemas with no side effects, so they can be imported by tests and
 * tooling without triggering validation of the current process environment.
 */

export const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
})

export const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
})

/**
 * AI provider config (server-only). Kept separate from the core server schema
 * so provider wiring doesn't force Supabase vars to be present, and vice versa.
 * Default model path is NVIDIA NIM (free/open-source), OpenAI-compatible.
 */
export const nimSchema = z.object({
  NVIDIA_NIM_API_KEY: z.string().min(1),
  NIM_LLM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NIM_LLM_MODEL: z.string().min(1).default('meta/llama-3.3-70b-instruct'),
})

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>
export type NimEnv = z.infer<typeof nimSchema>
