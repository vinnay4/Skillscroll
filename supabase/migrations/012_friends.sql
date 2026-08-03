-- 012_friends.sql — friend codes, friendships, and the weekly XP leaderboard
-- (friends only, PRD 6.2 Phase 2). No public follower graph (PRD 15).

alter table public.users
  add column friend_code text unique
  default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  friend_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> friend_id)
);

create unique index friendships_pair_idx on public.friendships (user_id, friend_id);

alter table public.friendships enable row level security;

create policy "Users can read own friendships"
  on public.friendships for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));

-- Friendships are created only through add_friend_by_code (security definer).

create or replace function public.add_friend_by_code(code text)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid;
  target uuid;
  target_name text;
begin
  select id into me from users where auth_id = auth.uid();
  if me is null then
    return json_build_object('error', 'Not signed in');
  end if;

  select id, display_name into target, target_name
  from users where friend_code = upper(trim(code));
  if target is null then
    return json_build_object('error', 'No user with that code');
  end if;
  if target = me then
    return json_build_object('error', 'That is your own code');
  end if;

  -- Mutual friendship: one row per direction, idempotent
  insert into friendships (user_id, friend_id) values (me, target)
    on conflict (user_id, friend_id) do nothing;
  insert into friendships (user_id, friend_id) values (target, me)
    on conflict (user_id, friend_id) do nothing;

  return json_build_object('friend_name', target_name);
end;
$$;

create or replace function public.get_weekly_leaderboard()
returns table (display_name text, weekly_xp bigint, is_me boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from users where auth_id = auth.uid();
  if me is null then
    return;
  end if;

  return query
  select
    u.display_name,
    coalesce(sum(x.amount), 0)::bigint as weekly_xp,
    (u.id = me) as is_me
  from users u
  left join xp_transactions x
    on x.user_id = u.id and x.created_at >= now() - interval '7 days'
  where u.id = me
     or u.id in (select f.friend_id from friendships f where f.user_id = me)
  group by u.id, u.display_name
  order by weekly_xp desc;
end;
$$;
