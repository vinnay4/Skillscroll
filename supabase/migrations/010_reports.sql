-- 010_reports.sql — long-press issue reports on lessons (REQ-022)

create table public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  lesson_id text not null references public.lessons (id) on delete cascade,
  category text not null check (category in ('content_error', 'typo', 'playback', 'other')),
  message text,
  created_at timestamptz not null default now()
);

create index lesson_reports_lesson_idx on public.lesson_reports (lesson_id);

alter table public.lesson_reports enable row level security;

create policy "Anyone authenticated can submit reports"
  on public.lesson_reports for insert
  to authenticated
  with check (true);
