-- 011_series.sql — topic deep-dives: ordered series of lessons (PRD 6.2, Phase 2)

create table public.series (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('finance', 'technology', 'communication', 'productivity')),
  language text not null default 'en' check (language in ('en', 'hi')),
  created_at timestamptz not null default now()
);

create table public.series_lessons (
  series_id text not null references public.series (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  position int not null,
  primary key (series_id, lesson_id)
);

create index series_lessons_series_idx on public.series_lessons (series_id, position);

alter table public.series enable row level security;
alter table public.series_lessons enable row level security;

create policy "Series are readable by everyone"
  on public.series for select
  using (true);

create policy "Series lessons are readable by everyone"
  on public.series_lessons for select
  using (true);
