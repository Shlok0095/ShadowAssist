import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Belt-and-suspenders: middleware already guards this route.
  if (!user) redirect('/login')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1>Your room</h1>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="text-lg font-semibold">{user.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          Milestone 1 is scaffolding only — auth, schema, and deploy config are in place.
          The session flow, onboarding, and reports arrive in later milestones.
        </p>
        <Button size="lg" disabled>
          Start a session (coming in Milestone 3)
        </Button>
      </section>
    </main>
  )
}
