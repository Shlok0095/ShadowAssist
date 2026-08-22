import { describe, expect, it } from 'vitest'

import { clientSchema, serverSchema } from '@/lib/env.schema'

describe('clientSchema', () => {
  it('accepts a valid public config and defaults the site URL', () => {
    const parsed = clientSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
  })

  it('rejects a non-URL Supabase URL', () => {
    const result = clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty anon key', () => {
    const result = clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('serverSchema', () => {
  it('requires the service role key and database URL', () => {
    const result = serverSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = Object.keys(result.error.flatten().fieldErrors)
      expect(fields).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(fields).toContain('DATABASE_URL')
    }
  })

  it('accepts a fully specified server env', () => {
    const parsed = serverSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      DATABASE_URL: 'postgresql://localhost:6543/postgres',
      NEXT_PUBLIC_SITE_URL: 'https://reproom.app',
    })
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe('https://reproom.app')
  })
})
