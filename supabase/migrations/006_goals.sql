-- 006_goals.sql — daily_goals table, composite index on (user_id, date)

create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  goal_lessons_count int not null,
  completed_lessons_count int not null default 0,
  goal_met_at timestamptz
);

create unique index daily_goals_user_date_idx on public.daily_goals (user_id, date);

alter table public.daily_goals enable row level security;

create policy "Users can read own daily goals"
  on public.daily_goals for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

-- Daily goal counters are advanced exclusively by edge functions (service role).
