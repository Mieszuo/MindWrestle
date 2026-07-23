-- AI usage tracking for admin analytics (service role writes; no user RLS policies)

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.conversation_attempts (id) on delete set null,
  level_id integer references public.game_levels (id) on delete set null,
  call_type text not null check (
    call_type in ('judge', 'character', 'objective', 'sage_key_guess', 'psych_judge', 'psych_character')
  ),
  model text not null,
  provider text not null default 'openrouter',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(12, 8),
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_id_idx on public.ai_usage_events (user_id);
create index if not exists ai_usage_events_created_at_idx on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_events_attempt_id_idx on public.ai_usage_events (attempt_id);

alter table public.ai_usage_events enable row level security;
