-- 009_bookmarks.sql — lesson bookmarking / save for later (PRD 6.2, Phase 2)

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index bookmarks_user_lesson_idx on public.bookmarks (user_id, lesson_id);

alter table public.bookmarks enable row level security;

create policy "Users can read own bookmarks"
  on public.bookmarks for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  using (user_id in (select id from public.users where auth_id = auth.uid()));
