create table if not exists public.game_character_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null references public.game_levels (id) on delete cascade,
  character_id text,
  game_mode text not null default 'normal',
  completed boolean not null default false,
  trust integer not null default 50,
  suspicion integer not null default 0,
  patience integer not null default 50,
  pressure integer not null default 0,
  scene_flags jsonb not null default '{}'::jsonb,
  burned_opportunities jsonb not null default '[]'::jsonb,
  unlocked_clues jsonb not null default '[]'::jsonb,
  unlocked_dialogue_options jsonb not null default '[]'::jsonb,
  persistent_memory jsonb not null default '{}'::jsonb,
  risky_action_summary jsonb not null default '{}'::jsonb,
  challenge_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level_id)
);

create index if not exists game_character_progress_user_idx on public.game_character_progress (user_id);
create index if not exists game_character_progress_user_level_idx on public.game_character_progress (user_id, level_id);

alter table public.game_character_progress enable row level security;

create policy "Users can view own character progress"
  on public.game_character_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own character progress"
  on public.game_character_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own character progress"
  on public.game_character_progress for update
  using (auth.uid() = user_id);


create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.conversation_attempts (id) on delete cascade,
  action_family text not null,
  classification jsonb not null default '{}'::jsonb,
  difficulty integer not null,
  modifiers jsonb not null default '[]'::jsonb,
  possible_consequences jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pending_actions_user_idx on public.pending_actions (user_id);
create index if not exists pending_actions_attempt_idx on public.pending_actions (attempt_id);

alter table public.pending_actions enable row level security;

create policy "Users can view own pending actions"
  on public.pending_actions for select
  using (auth.uid() = user_id);

create policy "Users can insert own pending actions"
  on public.pending_actions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pending actions"
  on public.pending_actions for update
  using (auth.uid() = user_id);

create policy "Users can delete own pending actions"
  on public.pending_actions for delete
  using (auth.uid() = user_id);
