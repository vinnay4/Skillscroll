-- Deep-dive series seed. Mirrors app/src/data/series.ts.

insert into public.series (id, title, description, category, language) values
  ('series-money-basics', 'Money Basics',
   'From your first emergency fund to picking the right mutual fund plan — in order.',
   'finance', 'en'),
  ('series-focus-fundamentals', 'Focus Fundamentals',
   'Beat procrastination, build deep-work blocks, and make habits stick.',
   'productivity', 'en'),
  ('series-speak-with-impact', 'Speak with Impact',
   'Interviews, negotiations, emails, and presentations that land.',
   'communication', 'en'),
  ('series-tech-literacy', 'Tech Literacy 101',
   'APIs, the cloud, caching, and AI — the concepts behind every app you use.',
   'technology', 'en')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  language = excluded.language;

insert into public.series_lessons (series_id, lesson_id, position) values
  ('series-money-basics', 'fin-003', 0),
  ('series-money-basics', 'fin-006', 1),
  ('series-money-basics', 'fin-004', 2),
  ('series-money-basics', 'fin-002', 3),
  ('series-money-basics', 'fin-005', 4),
  ('series-money-basics', 'fin-001', 5),
  ('series-focus-fundamentals', 'prod-001', 0),
  ('series-focus-fundamentals', 'prod-005', 1),
  ('series-focus-fundamentals', 'prod-002', 2),
  ('series-focus-fundamentals', 'prod-003', 3),
  ('series-focus-fundamentals', 'prod-004', 4),
  ('series-focus-fundamentals', 'prod-006', 5),
  ('series-speak-with-impact', 'comm-001', 0),
  ('series-speak-with-impact', 'comm-004', 1),
  ('series-speak-with-impact', 'comm-003', 2),
  ('series-speak-with-impact', 'comm-005', 3),
  ('series-speak-with-impact', 'comm-002', 4),
  ('series-speak-with-impact', 'comm-006', 5),
  ('series-tech-literacy', 'tech-001', 0),
  ('series-tech-literacy', 'tech-006', 1),
  ('series-tech-literacy', 'tech-002', 2),
  ('series-tech-literacy', 'tech-004', 3),
  ('series-tech-literacy', 'tech-003', 4),
  ('series-tech-literacy', 'tech-005', 5)
on conflict (series_id, lesson_id) do update set position = excluded.position;
