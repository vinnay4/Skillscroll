-- 007_feedback.sql — swipe-left "not interested" signals that train the
-- Phase 2 recommendation engine (PRD 8.1 / 9.3)

create table public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  lesson_id text not null references public.lessons (id) on delete cascade,
  reason text not null check (reason in ('already_know', 'wrong_topic', 'too_basic')),
  created_at timestamptz not null default now()
);

create index lesson_feedback_lesson_idx on public.lesson_feedback (lesson_id);

alter table public.lesson_feedback enable row level security;

create policy "Anyone authenticated can submit feedback"
  on public.lesson_feedback for insert
  to authenticated
  with check (true);
