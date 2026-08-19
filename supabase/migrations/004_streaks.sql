-- 004_streaks.sql — streaks table, one row per user

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completed_date date,
  freeze_available boolean not null default true,
  freeze_granted_week text
);

alter table public.streaks enable row level security;

create policy "Users can read own streak"
  on public.streaks for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

-- Streak mutations happen exclusively in edge functions (service role),
-- so no client-side insert/update policies are defined.
