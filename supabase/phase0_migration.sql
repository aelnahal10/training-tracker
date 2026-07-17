-- Phase 0 migration — adds the scheduled_exercises table (the DB-driven weekly
-- program template). Run this once in the Supabase dashboard:
--   SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- After running this, just reload the app while signed in: it will add Phase 0,
-- shift Phase 1/2 dates, and seed the Phase 0 schedule automatically.

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

alter table public.scheduled_exercises enable row level security;
drop policy if exists own_rows on public.scheduled_exercises;
create policy own_rows on public.scheduled_exercises for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.scheduled_exercises to authenticated;
