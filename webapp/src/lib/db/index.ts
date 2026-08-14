import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

/**
 * Server-only Drizzle client backed by postgres.js against the Supabase pooled
 * connection. This uses the service-role DATABASE_URL and therefore bypasses
 * RLS — only ever call it from server code that has already authorized the user
 * (route handlers / server actions that check the Supabase session first).
 *
 * A singleton avoids exhausting the connection pool during dev HMR.
 */
declare global {
  // eslint-disable-next-line no-var
  var __reproomPg: ReturnType<typeof postgres> | undefined
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const client =
  globalThis.__reproomPg ??
  postgres(connectionString, {
    prepare: false, // required for Supabase transaction-mode pooling (PgBouncer)
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__reproomPg = client
}

export const db = drizzle(client, { schema })
export { schema }
