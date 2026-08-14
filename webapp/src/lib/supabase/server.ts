import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

import { clientEnv } from '@/lib/env'

/**
 * Server Supabase client bound to the request cookie jar. Use in Server
 * Components, route handlers, and server actions to read the authenticated
 * session. Still only uses the anon key + user JWT, so RLS applies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component where cookies are read-only.
            // The middleware refresh path handles writing refreshed tokens.
          }
        },
      },
    },
  )
}
