create table if not exists public.game_levels (
  id integer primary key,
  slug text not null unique,
  order_index integer not null unique check (order_index > 0),
  title text not null,
  character_name text not null,
  archetype text not null,
  short_description text not null,
  difficulty_label text not null,
  difficulty_score integer not null check (difficulty_score between 1 and 10),
  is_active boolean not null default true,
  objective_type text not null check (objective_type in ('TARGET_UTTERANCE', 'AGREEMENT', 'SECRET_REVEAL', 'CONCESSION')),
  objective_config jsonb not null default '{}'::jsonb,
  starting_emotion_state jsonb not null default '{}'::jsonb,
  character_config jsonb not null default '{}'::jsonb,
  unlock_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_levels enable row level security;

create policy "Anyone can view active game levels"
  on public.game_levels for select
  using (is_active = true);

create table if not exists public.user_level_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null references public.game_levels (id) on delete cascade,
  status text not null check (status in ('LOCKED', 'AVAILABLE', 'CURRENT', 'COMPLETED')),
  attempts_count integer not null default 0 check (attempts_count >= 0),
  completed_attempts_count integer not null default 0 check (completed_attempts_count >= 0),
  failed_attempts_count integer not null default 0 check (failed_attempts_count >= 0),
  best_attempt_id uuid,
  best_time_ms integer check (best_time_ms is null or best_time_ms >= 0),
  last_attempt_id uuid,
  last_time_ms integer check (last_time_ms is null or last_time_ms >= 0),
  last_status text,
  unlocked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level_id)
);

create index if not exists user_level_progress_user_idx on public.user_level_progress (user_id);
create index if not exists user_level_progress_user_level_idx on public.user_level_progress (user_id, level_id);

alter table public.user_level_progress enable row level security;

create policy "Users can view own level progress"
  on public.user_level_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own level progress"
  on public.user_level_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own level progress"
  on public.user_level_progress for update
  using (auth.uid() = user_id);

create table if not exists public.conversation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null references public.game_levels (id) on delete cascade,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'ERROR')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  turns_count integer not null default 0 check (turns_count >= 0),
  user_messages_count integer not null default 0 check (user_messages_count >= 0),
  npc_messages_count integer not null default 0 check (npc_messages_count >= 0),
  current_emotion_state jsonb not null default '{}'::jsonb,
  goal_progress integer not null default 0 check (goal_progress between 0 and 100),
  memory_summary text,
  completed_by text,
  failure_reason text,
  last_activity_at timestamptz not null default now(),
  ai_model_judge text,
  ai_model_character text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversation_attempts_user_idx on public.conversation_attempts (user_id);
create index if not exists conversation_attempts_user_level_status_idx on public.conversation_attempts (user_id, level_id, status);
create index if not exists conversation_attempts_status_activity_idx on public.conversation_attempts (status, last_activity_at);

alter table public.conversation_attempts enable row level security;

create policy "Users can view own attempts"
  on public.conversation_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.conversation_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attempts"
  on public.conversation_attempts for update
  using (auth.uid() = user_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.conversation_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id integer not null references public.game_levels (id) on delete cascade,
  role text not null check (role in ('USER', 'CHARACTER', 'SYSTEM_EVENT')),
  turn_index integer not null check (turn_index >= 0),
  content text not null,
  emotion_state_before jsonb,
  emotion_state_after jsonb,
  judge_output jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_attempt_turn_idx on public.conversation_messages (attempt_id, turn_index, created_at);
create index if not exists conversation_messages_user_idx on public.conversation_messages (user_id);

alter table public.conversation_messages enable row level security;

create policy "Users can view own messages"
  on public.conversation_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.conversation_messages for insert
  with check (auth.uid() = user_id);

create table if not exists public.level_rankings (
  id uuid primary key default gen_random_uuid(),
  level_id integer not null references public.game_levels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.conversation_attempts (id) on delete cascade,
  duration_ms integer not null check (duration_ms >= 0),
  turns_count integer not null check (turns_count >= 0),
  completed_at timestamptz not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (attempt_id)
);

create index if not exists level_rankings_level_duration_idx on public.level_rankings (level_id, duration_ms, turns_count, completed_at);
create index if not exists level_rankings_level_user_duration_idx on public.level_rankings (level_id, user_id, duration_ms);

alter table public.level_rankings enable row level security;

create policy "Anyone can view rankings"
  on public.level_rankings for select
  using (true);

create policy "Users can insert own rankings"
  on public.level_rankings for insert
  with check (auth.uid() = user_id);

insert into public.game_levels (
  id,
  slug,
  order_index,
  title,
  character_name,
  archetype,
  short_description,
  difficulty_label,
  difficulty_score,
  objective_type,
  objective_config,
  starting_emotion_state,
  character_config,
  unlock_config
) values
  (
    1,
    'dziecko-jablko',
    1,
    'Dziecko Mila',
    'Dziecko Mila',
    'Ciekawska i wrażliwa',
    'Rozprasza się i odpowiada bajkowo.',
    'łatwa',
    2,
    'TARGET_UTTERANCE',
    '{"type":"TARGET_UTTERANCE","targetPhrase":"jabłko","acceptedVariants":["jabłko"],"matchMode":"exact_word","minimumGoalProgress":75,"requiredState":{"trust":{"min":65},"suspicion":{"max":40},"patience":{"min":20}}}'::jsonb,
    '{"trust":45,"suspicion":25,"patience":80}'::jsonb,
    '{"name":"Dziecko Mila","archetype":"Ciekawska i wrażliwa","publicDescription":"Rozprasza się i odpowiada bajkowo.","personality":{"coreTraits":["curious","sensitive","imaginative","easily distracted"],"speechStyle":"soft, simple, fairy-tale-like, indirect","emotionalTone":"gentle, cautious, childlike but not stupid"},"motivations":["wants to feel safe","likes stories and playful associations","does not want to disappoint anyone"],"fears":["being pressured","being tricked","saying something that causes harm"],"persuasionLevers":["gentle stories","playful associations","empathy","non-threatening tone"],"resistanceTriggers":["direct commands","pressure","cold logic","repeating the same demand"],"hiddenKnowledge":{"targetWord":"jabłko","whySheAvoidsIt":"She feels the word is connected to a memory she is unsure about."},"victoryStyle":{"whenReady":"She says the target word naturally as part of a small story or association."}}'::jsonb,
    '{"requiresCompletedLevelId":null}'::jsonb
  ),
  (2, 'handlarz-amulet', 2, 'Chytry Handlarz', 'Chytry Handlarz', 'Urodzony negocjator', 'Każdą odpowiedź traktuje jak ofertę i zawsze szuka przewagi.', 'łatwa', 3, 'SECRET_REVEAL', '{"type":"SECRET_REVEAL","minimumGoalProgress":80}'::jsonb, '{"interest":45,"caution":55,"bargain":35}'::jsonb, '{"name":"Chytry Handlarz","persuasionLevers":["value exchange","market knowledge","credible walkaway"],"resistanceTriggers":["begging","empty threats","naive trust"]}'::jsonb, '{"requiresCompletedLevelId":1}'::jsonb),
  (3, 'rycerz-pomoc', 3, 'Dumny Rycerz', 'Dumny Rycerz', 'Strażnik honoru', 'Nie znosi litości i bardzo trudno przyznaje się do słabości.', 'średnia', 5, 'CONCESSION', '{"type":"CONCESSION","minimumGoalProgress":82}'::jsonb, '{"respect":45,"pride":70,"patience":65}'::jsonb, '{"name":"Dumny Rycerz","persuasionLevers":["honor","responsibility","shared duty"],"resistanceTriggers":["pity","mockery","calling him weak"]}'::jsonb, '{"requiresCompletedLevelId":2}'::jsonb),
  (4, 'ork-rozejm', 4, 'Uparty Ork', 'Uparty Ork', 'Twardy sceptyk', 'Szanuje odwagę, konkret i tych, którzy nie cofają słów.', 'średnia', 5, 'AGREEMENT', '{"type":"AGREEMENT","minimumGoalProgress":82}'::jsonb, '{"respect":35,"stubbornness":75,"irritation":35}'::jsonb, '{"name":"Uparty Ork","persuasionLevers":["directness","courage","simple tradeoffs"],"resistanceTriggers":["fear","long speeches","tricks"]}'::jsonb, '{"requiresCompletedLevelId":3}'::jsonb),
  (5, 'medrzec-klucz', 5, 'Jasny Mędrzec', 'Jasny Mędrzec', 'Mistrz zagadek', 'Odpowiada pytaniem na pytanie i sprawdza intencje rozmówcy.', 'średnia', 6, 'SECRET_REVEAL', '{"type":"SECRET_REVEAL","minimumGoalProgress":85}'::jsonb, '{"curiosity":50,"caution":50,"patience":70}'::jsonb, '{"name":"Jasny Mędrzec","persuasionLevers":["patience","logical connection","humility"],"resistanceTriggers":["rushing","literal demands","arrogance"]}'::jsonb, '{"requiresCompletedLevelId":4}'::jsonb),
  (6, 'krol-brama', 6, 'Wspaniały Król', 'Wspaniały Król', 'Dumny władca', 'Słucha tylko argumentów godnych korony i nie toleruje pustych pochlebstw.', 'trudna', 8, 'AGREEMENT', '{"type":"AGREEMENT","minimumGoalProgress":88}'::jsonb, '{"respect":40,"ego":75,"patience":60}'::jsonb, '{"name":"Wspaniały Król","persuasionLevers":["legacy","dignity","kingdom benefit"],"resistanceTriggers":["mockery","commands","emotional begging"]}'::jsonb, '{"requiresCompletedLevelId":5}'::jsonb),
  (7, 'bog-prawda', 7, 'Bóg', 'Bóg', 'Ostateczna próba', 'Słucha uważnie, ale nie oddaje prawdy za darmo.', 'trudna', 10, 'SECRET_REVEAL', '{"type":"SECRET_REVEAL","minimumGoalProgress":92}'::jsonb, '{"attention":45,"insight":80,"distance":70}'::jsonb, '{"name":"Bóg","persuasionLevers":["paradox","humility","accepting uncertainty"],"resistanceTriggers":["trying to dominate","cheap certainty","flattery"]}'::jsonb, '{"requiresCompletedLevelId":6}'::jsonb)
on conflict (id) do update set
  slug = excluded.slug,
  order_index = excluded.order_index,
  title = excluded.title,
  character_name = excluded.character_name,
  archetype = excluded.archetype,
  short_description = excluded.short_description,
  difficulty_label = excluded.difficulty_label,
  difficulty_score = excluded.difficulty_score,
  objective_type = excluded.objective_type,
  objective_config = excluded.objective_config,
  starting_emotion_state = excluded.starting_emotion_state,
  character_config = excluded.character_config,
  unlock_config = excluded.unlock_config,
  updated_at = now();
