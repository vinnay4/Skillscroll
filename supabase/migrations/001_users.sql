-- 001_users.sql — users table with RLS policies (PRD 9.4 / 14.3)

create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users (id) on delete cascade,
  display_name text not null default 'Learner',
  created_at timestamptz not null default now(),
  onboarding_topics text[] not null default '{}',
  daily_goal_minutes int not null default 10 check (daily_goal_minutes in (5, 10, 15)),
  timezone text not null default 'Asia/Kolkata',
  level int not null default 0,
  total_xp int not null default 0
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = auth_id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = auth_id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = auth_id);

-- Auto-provision a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (auth_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Learner'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
