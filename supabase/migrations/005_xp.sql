-- 005_xp.sql — xp_transactions table, index on user_id + created_at

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount int not null,
  reason text not null check (reason in ('lesson_complete', 'quiz_correct', 'streak_bonus', 'daily_goal')),
  created_at timestamptz not null default now()
);

create index xp_transactions_user_created_idx
  on public.xp_transactions (user_id, created_at desc);

alter table public.xp_transactions enable row level security;

create policy "Users can read own xp transactions"
  on public.xp_transactions for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

-- XP is credited exclusively by edge functions (service role).
