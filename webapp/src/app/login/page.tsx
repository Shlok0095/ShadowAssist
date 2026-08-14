'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { clientEnv } from '@/lib/env'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const redirectTo = `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      setStatus('sent')
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="RepRoom" width={56} height={56} className="rounded-2xl" />
        <h1>Sign in to RepRoom</h1>
        <p className="text-muted-foreground">Practice interviews, out loud.</p>
      </div>

      {status === 'sent' ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border bg-card p-6 text-center"
        >
          <p className="text-lg font-semibold">Check your email</p>
          <p className="mt-2 text-muted-foreground">
            We sent a magic link to <span className="text-foreground">{email}</span>. Open
            it on this device to finish signing in.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-14 rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="lg" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}

      <div className="flex items-center gap-4 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" size="lg" onClick={signInWithGoogle}>
        Continue with Google
      </Button>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  )
}
