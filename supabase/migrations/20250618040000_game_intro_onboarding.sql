alter table public.profiles
  add column if not exists has_seen_game_intro boolean not null default false,
  add column if not exists game_intro_seen_at timestamptz,
  add column if not exists game_intro_version integer not null default 1;

create index if not exists profiles_game_intro_state_idx
  on public.profiles (id, has_seen_game_intro);
