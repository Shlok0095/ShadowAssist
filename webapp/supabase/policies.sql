-- RepRoom · Row-Level Security + auth provisioning
--
-- Apply this AFTER the generated Drizzle table migration (drizzle/0000_*.sql).
-- It:
--   1) auto-provisions an app `users` row when a Supabase auth user is created,
--   2) enables RLS on every table,
--   3) restricts every row to its owning user via auth.uid().
--
-- This file is intentionally NOT part of the drizzle-kit journal (it touches
-- the auth schema and policies, which Drizzle does not manage). Apply it via the
-- Supabase SQL editor, or: psql "$DIRECT_URL" -f supabase/policies.sql

-- ── 1. Provision app users from auth.users ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Enable RLS ─────────────────────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.profiles         enable row level security;
alter table public.job_targets      enable row level security;
alter table public.sessions         enable row level security;
alter table public.turns            enable row level security;
alter table public.questions        enable row level security;
alter table public.evaluations      enable row level security;
alter table public.session_reports  enable row level security;

-- ── 3. Policies ───────────────────────────────────────────────────────────────
-- users: a user can see and update only their own row.
create policy users_select_own on public.users
  for select using (auth.uid() = id);
create policy users_update_own on public.users
  for update using (auth.uid() = id);

-- profiles: owner full access.
create policy profiles_all_own on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- job_targets: owner full access.
create policy job_targets_all_own on public.job_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions: owner full access.
create policy sessions_all_own on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables scope through the parent session's owner.
create policy turns_all_own on public.turns
  for all using (
    exists (select 1 from public.sessions s where s.id = turns.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = turns.session_id and s.user_id = auth.uid())
  );

create policy questions_all_own on public.questions
  for all using (
    exists (select 1 from public.sessions s where s.id = questions.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = questions.session_id and s.user_id = auth.uid())
  );

create policy evaluations_all_own on public.evaluations
  for all using (
    exists (select 1 from public.sessions s where s.id = evaluations.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = evaluations.session_id and s.user_id = auth.uid())
  );

create policy session_reports_all_own on public.session_reports
  for all using (
    exists (select 1 from public.sessions s where s.id = session_reports.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = session_reports.session_id and s.user_id = auth.uid())
  );
