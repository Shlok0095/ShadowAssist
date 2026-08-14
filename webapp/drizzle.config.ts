import { defineConfig } from 'drizzle-kit'

// drizzle-kit reads env directly (it does not go through next). Migrations use
// the DIRECT (non-pooled) connection; generation works offline without a URL.
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
