-- 008_push_tokens.sql — Expo push token per user, required by the
-- send-reminder and comeback-nudge server-side notifications (PRD 5.5)

alter table public.users add column push_token text;
alter table public.users add column reminder_hour int not null default 21;
