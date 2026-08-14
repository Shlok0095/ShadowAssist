import { NextResponse } from 'next/server'

/** Liveness probe. Intentionally does not touch the DB or any secret. */
export function GET() {
  return NextResponse.json({ status: 'ok', app: 'reproom', ts: Date.now() })
}
