-- Training Tracker — Supabase schema
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses "if not exists" / "drop policy if exists").
--
-- Model: one owner (you). Every row is stamped with your auth user id and
-- Row Level Security makes the public anon key only ever able to read/write
-- rows that belong to the signed-in user.

-- ---------------------------------------------------------------------------
-- 1) PROFILE  — one row per user: height + the per-user exercise catalogue
--    (the catalogue is stored as JSON because the app edits it as a whole.)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  height_cm   numeric,
  exercises   jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) PHASES
-- ---------------------------------------------------------------------------
create table if not exists public.phases (
  id                 text primary key,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null default '',
  start_date         date not null,
  end_date           date not null,
  description        text not null default '',
  unlocked_exercises jsonb not null default '[]'::jsonb
);
create index if not exists phases_user_idx on public.phases (user_id, start_date);

-- ---------------------------------------------------------------------------
-- 3) SESSIONS  (logged exercise entries kept as JSON — nested + app-specific)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  phase_id      text not null default '',
  type          text not null check (type in ('training', 'iso_only', 'rest')),
  iso_completed boolean not null default false,
  pain_elbow    int  not null default 0,
  pain_knee     int  not null default 0,
  exercises     jsonb not null default '[]'::jsonb,
  notes         text not null default ''
);
create index if not exists sessions_user_date_idx on public.sessions (user_id, date);

-- ---------------------------------------------------------------------------
-- 4) BODY METRICS
-- ---------------------------------------------------------------------------
create table if not exists public.metrics (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null,
  weight_kg        numeric not null,
  muscle_mass_kg   numeric,
  body_fat_percent numeric
);
create index if not exists metrics_user_date_idx on public.metrics (user_id, date);

-- ---------------------------------------------------------------------------
-- 5) WEEKLY CHECK-INS
-- ---------------------------------------------------------------------------
create table if not exists public.checkins (
  id                   text primary key,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start_date      date not null,
  max_wall_sit_seconds int  not null default 0,
  notes                text not null default ''
);
create index if not exists checkins_user_idx on public.checkins (user_id, week_start_date);

-- ---------------------------------------------------------------------------
-- 6) SCHEDULED EXERCISES — DB-driven weekly program template (e.g. Phase 0)
-- ---------------------------------------------------------------------------
create table if not exists public.scheduled_exercises (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  phase_id         text not null references public.phases (id) on delete cascade,
  day_of_week      int  not null,          -- 0=Sun..6=Sat; -1 = every day (daily iso)
  week_start       int,                    -- inclusive; null = all weeks
  week_end         int,                    -- inclusive; null = all weeks
  position         int  not null default 0,
  name             text not null,
  kind             text not null,          -- cardio | breathing | strength | iso | core
  sets             int,
  reps             text,
  weight           numeric,
  duration_seconds int,
  work_seconds     int,
  recovery_seconds int,
  rest_seconds     int,
  unit             text,
  note             text
);
create index if not exists sched_user_phase_dow_idx
  on public.scheduled_exercises (user_id, phase_id, day_of_week);

-- ---------------------------------------------------------------------------
-- Row Level Security — each user can only touch their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.phases              enable row level security;
alter table public.sessions            enable row level security;
alter table public.metrics             enable row level security;
alter table public.checkins            enable row level security;
alter table public.scheduled_exercises enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['profiles', 'phases', 'sessions', 'metrics', 'checkins', 'scheduled_exercises'] loop
    execute format('drop policy if exists own_rows on public.%I;', tbl);
    execute format(
      'create policy own_rows on public.%I for all to authenticated '
      || 'using (user_id = auth.uid()) with check (user_id = auth.uid());',
      tbl
    );
  end loop;
end $$;

-- API roles need table privileges too (RLS still restricts which rows).
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.phases, public.sessions, public.metrics, public.checkins,
     public.scheduled_exercises
  to authenticated;
