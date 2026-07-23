alter table public.profiles
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists conversation_attempts_user_started_idx
  on public.conversation_attempts (user_id, started_at desc);

create index if not exists conversation_attempts_user_level_started_idx
  on public.conversation_attempts (user_id, level_id, started_at desc);
