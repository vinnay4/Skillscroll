-- 002_lessons.sql — lessons table, indexes on category and language (PRD 14.3)

create table public.lessons (
  id text primary key,
  title text not null,
  category text not null check (category in ('finance', 'technology', 'communication', 'productivity')),
  -- Content tooling rejects lessons outside the 30–60s window (REQ-003)
  duration_seconds int not null check (duration_seconds between 30 and 60),
  video_url text,
  thumbnail_url text,
  quiz_question text not null,
  quiz_options text[] not null check (array_length(quiz_options, 1) = 4),
  quiz_correct_index int not null check (quiz_correct_index between 0 and 3),
  -- Mandatory 4-part structure enforced at creation time (PRD 5.2)
  structure_hook text not null,
  structure_concept text not null,
  structure_example text not null,
  structure_takeaway text not null,
  try_this_today text,
  quality_score numeric not null default 50,
  language text not null default 'en' check (language in ('en', 'hi')),
  created_at timestamptz not null default now()
);

create index lessons_category_idx on public.lessons (category);
create index lessons_language_idx on public.lessons (language);
create index lessons_quality_idx on public.lessons (quality_score desc);

alter table public.lessons enable row level security;

-- Lesson content is public read; writes go through the service role only
create policy "Lessons are readable by everyone"
  on public.lessons for select
  using (true);
