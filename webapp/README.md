# RepRoom

Mobile-first PWA for **practice** interviews: a realistic AI interviewer runs
user-initiated mock sessions and gives structured coaching afterward.

RepRoom is a practice-and-review tool. It is explicitly **not** a live-interview
assistant — there is no stealth/overlay/background-listening mode, and it never
joins or listens to a real third-party interview. Copy reads "get better at
interviewing," never "get through one."

> This app lives on the `webapp` branch in a `webapp/` subfolder. The repository
> root is the separate VeilAssist desktop application; RepRoom only reuses its
> logo asset and references its STT approach for the provider abstraction.

## Stack

- Next.js 15 (App Router, TypeScript strict) — Vercel deploy target
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage) with Row-Level Security
- Drizzle ORM (`postgres.js` driver)
- Zod at every API and LLM boundary
- AI providers (later milestones) behind swappable `SttProvider` / `LlmProvider` /
  `TtsProvider` interfaces

## Milestone status

**Milestone 1 (this branch): scaffold, auth, schema + migrations, deploy config.
No AI yet.** Later milestones: onboarding/resume, text mock interview, evaluator +
report, audio + STT, TTS + latency, history/trends/question-bank, PWA/consent/a11y/limits.

## Getting started

```bash
cd webapp
cp .env.example .env.local   # fill in Supabase + DB values
npm install
npm run dev                  # http://localhost:3000
```

### Required configuration (see `.env.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server auth (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged operations |
| `DATABASE_URL` | Pooled Postgres (port 6543) for the app |
| `DIRECT_URL` | Direct Postgres (port 5432) for migrations |
| `NEXT_PUBLIC_SITE_URL` | Auth redirect base URL |

### Database

```bash
npm run db:generate          # generate SQL from the Drizzle schema (offline)
npm run db:migrate            # apply drizzle/*.sql to $DIRECT_URL
psql "$DIRECT_URL" -f supabase/policies.sql   # enable RLS + auth-user trigger
```

- Table migration: `drizzle/0000_*.sql` (generated).
- RLS + `handle_new_user` trigger: `supabase/policies.sql` (applied separately,
  since it touches the `auth` schema Drizzle does not manage).

### Auth

Supabase SSR auth via `@supabase/ssr`: email magic link + Google OAuth. Configure
in the Supabase dashboard:

1. Enable the **Email** provider (magic link).
2. Enable **Google** and add the OAuth client id/secret.
3. Add redirect URL `${NEXT_PUBLIC_SITE_URL}/auth/callback` to allowed URLs.

`src/middleware.ts` refreshes the session on every request and redirects
unauthenticated users away from `/dashboard`, `/onboarding`, `/session`,
`/history`, `/report`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run test` | Vitest |
| `npm run db:generate` / `db:migrate` / `db:push` | Drizzle migrations |

## Deploy (Vercel)

Set the project **root directory** to `webapp/`. Add every variable from
`.env.example` in the Vercel project settings. `vercel.json` pins the Next.js
framework preset.

### One-shot deploy from a machine with the secrets

```bash
cd webapp

# 1. Apply schema + RLS to Supabase (needs DATABASE_URL / DIRECT_URL exported)
npm run db:migrate                         # drizzle/0000_*.sql (tables + indexes)
node scripts/apply-policies.mjs            # supabase/policies.sql (RLS + trigger)

# 2. Deploy to Vercel (needs VERCEL_TOKEN exported)
npx vercel link --yes --token "$VERCEL_TOKEN"
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
         SUPABASE_SERVICE_ROLE_KEY DATABASE_URL DIRECT_URL \
         NEXT_PUBLIC_SITE_URL NVIDIA_NIM_API_KEY NIM_LLM_MODEL; do
  printf '%s' "${!v}" | npx vercel env add "$v" production --token "$VERCEL_TOKEN" --force
done
npx vercel deploy --prod --token "$VERCEL_TOKEN"
```

After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the production URL and add
`${NEXT_PUBLIC_SITE_URL}/auth/callback` to Supabase → Authentication → URL
Configuration (Redirect URLs), then redeploy.
