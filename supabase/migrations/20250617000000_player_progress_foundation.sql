-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.level_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null check (level_id > 0),
  status text not null check (status in ('completed', 'mastered')),
  best_score jsonb,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level_id)
);

create index if not exists level_completions_user_id_idx on public.level_completions (user_id);

alter table public.level_completions enable row level security;

create policy "Users can view own completions"
  on public.level_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.level_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own completions"
  on public.level_completions for update
  using (auth.uid() = user_id);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null check (level_id > 0),
  messages jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_sessions_user_id_idx on public.game_sessions (user_id);
create index if not exists game_sessions_user_level_idx on public.game_sessions (user_id, level_id);

alter table public.game_sessions enable row level security;

create policy "Users can view own sessions"
  on public.game_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.game_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.game_sessions for update
  using (auth.uid() = user_id);
