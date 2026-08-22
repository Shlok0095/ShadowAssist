import { createBrowserClient } from '@supabase/ssr'

import { clientEnv } from '@/lib/env'

/** Browser Supabase client. Only ever sees the anon key (RLS-protected). */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
