-- 013_quality.sql — lesson quality feedback loop (PRD 9.3 / PRD 12):
-- quality_score becomes a composite of quiz pass rate + watch completion,
-- and lessons below a 60% pass rate are auto-flagged for editorial review.

alter table public.lessons add column flagged_for_review boolean not null default false;

-- Per-lesson engagement statistics for the content team
create view public.lesson_quality_stats as
select
  l.id as lesson_id,
  l.title,
  l.category,
  l.language,
  l.quality_score,
  l.flagged_for_review,
  count(p.id) as attempts,
  coalesce(avg(case when p.quiz_correct then 1.0 else 0.0 end), 0) as quiz_pass_rate,
  coalesce(avg(p.watch_percentage), 0) as avg_watch_percentage
from public.lessons l
left join public.user_lesson_progress p on p.lesson_id = l.id
group by l.id;

-- Recomputes quality_score (70% quiz pass rate + 30% watch completion) and
-- flags lessons under the 60% pass-rate threshold. Only lessons with a
-- minimum sample size are touched, so editorial seed scores hold until real
-- engagement data accumulates.
create or replace function public.refresh_lesson_quality_scores(min_attempts int default 20)
returns table (updated_count int, flagged_count int)
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated int;
  v_flagged int;
begin
  with stats as (
    select
      p.lesson_id,
      count(*) as attempts,
      avg(case when p.quiz_correct then 1.0 else 0.0 end) as pass_rate,
      avg(p.watch_percentage) as avg_watch
    from user_lesson_progress p
    group by p.lesson_id
    having count(*) >= min_attempts
  ),
  updated as (
    update lessons l
    set
      quality_score = round(s.pass_rate * 100 * 0.7 + s.avg_watch * 0.3, 1),
      flagged_for_review = (s.pass_rate < 0.6)
    from stats s
    where l.id = s.lesson_id
    returning l.id, l.flagged_for_review
  )
  select count(*), count(*) filter (where flagged_for_review)
  into v_updated, v_flagged
  from updated;

  return query select v_updated, v_flagged;
end;
$$;
