-- 003_progress.sql — user_lesson_progress, composite index on (user_id, lesson_id)

create table public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  quiz_answered boolean not null default false,
  quiz_correct boolean not null default false,
  watch_percentage numeric not null default 0 check (watch_percentage between 0 and 100)
);

create unique index user_lesson_progress_user_lesson_idx
  on public.user_lesson_progress (user_id, lesson_id);

alter table public.user_lesson_progress enable row level security;

create policy "Users can read own progress"
  on public.user_lesson_progress for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

create policy "Users can insert own progress"
  on public.user_lesson_progress for insert
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

create policy "Users can update own progress"
  on public.user_lesson_progress for update
  using (user_id in (select id from public.users where auth_id = auth.uid()));
