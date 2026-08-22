import { z } from 'zod'

import { clientSchema, serverSchema } from '@/lib/env.schema'

/**
 * Central, zod-validated environment access. Import `clientEnv` in client
 * components; call `serverEnv()` in server code. Fails fast if a required
 * variable is missing, so we never ship a half-configured deploy.
 */

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const flat = result.error.flatten().fieldErrors
    const missing = Object.entries(flat)
      .map(([k, v]) => `  - ${k}: ${(v ?? []).join(', ')}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${missing}`)
  }
  return result.data
}

export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
})

/**
 * Server env is validated lazily so client bundles and offline tooling (e.g.
 * drizzle-kit) don't crash on server-only secrets.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null
export function serverEnv(): z.infer<typeof serverSchema> {
  if (!cachedServerEnv) {
    cachedServerEnv = parse(serverSchema, process.env)
  }
  return cachedServerEnv
}
