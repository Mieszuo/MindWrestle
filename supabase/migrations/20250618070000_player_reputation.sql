alter table public.profiles
  add column if not exists reputation jsonb not null default '{
    "renown": 50,
    "traits": {
      "respect": 50,
      "warmth": 50,
      "pressure": 0,
      "cunning": 50,
      "arrogance": 0
    },
    "lastIncident": null
  }'::jsonb;

alter table public.conversation_attempts
  add column if not exists reputation_session jsonb not null default '{
    "respect": 0,
    "warmth": 0,
    "pressure": 0,
    "cunning": 0,
    "arrogance": 0,
    "tags": []
  }'::jsonb,
  add column if not exists reputation_context jsonb;
