// Applies supabase/policies.sql (RLS + auth-user trigger) to the database.
// drizzle-kit does not manage the auth schema or policies, so this runs them
// directly. Uses the DIRECT (non-pooled) connection.
//
//   node --env-file=.env.local scripts/apply-policies.mjs
//   (or ensure DIRECT_URL / DATABASE_URL is exported in the environment)
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.resolve(__dirname, '..', 'supabase', 'policies.sql')

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error('Set DIRECT_URL (preferred) or DATABASE_URL before running.')
  process.exit(1)
}

const sql = await readFile(sqlPath, 'utf8')
const client = postgres(url, { prepare: false, max: 1 })

try {
  await client.unsafe(sql)
  console.log('POLICIES_APPLIED_OK')
} catch (err) {
  console.error('Failed to apply policies:', err?.message || err)
  process.exitCode = 1
} finally {
  await client.end({ timeout: 5 })
}
