alter table public.conversation_attempts
  add column if not exists psych_state jsonb;

alter table public.profiles
  add column if not exists npc_relations jsonb not null default '{}'::jsonb;
