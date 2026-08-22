import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <header className="flex items-center gap-3">
        <Image src="/logo.png" alt="RepRoom" width={40} height={40} priority className="rounded-xl" />
        <span className="text-lg font-semibold tracking-tight">RepRoom</span>
      </header>

      <section className="flex flex-col gap-5 py-10">
        <h1 className="text-4xl font-bold leading-tight">
          Practice interviews,
          <br />
          out loud.
        </h1>
        <p className="text-lg text-muted-foreground">
          A realistic AI interviewer that actually probes your answers — then shows you
          exactly where to get stronger. Built to help you get better at interviewing,
          not to get through one.
        </p>
      </section>

      <footer className="flex flex-col gap-3">
        {user ? (
          <Button asChild size="lg">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link href="/login">Get started — free</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              3 practice sessions a month, no card required.
            </p>
          </>
        )}
      </footer>
    </main>
  )
}
