import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files, so the
     * Supabase session cookie is refreshed on every real navigation.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)',
  ],
}
