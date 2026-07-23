-- Atomic counter increment function for race-condition-safe updates
create or replace function public.increment_level_progress_counter(
  p_user_id uuid,
  p_level_id integer,
  p_column text
) returns void as $$
begin
  if p_column = 'completed_attempts_count' then
    update public.user_level_progress
    set completed_attempts_count = completed_attempts_count + 1,
        updated_at = now()
    where user_id = p_user_id and level_id = p_level_id;
  elsif p_column = 'failed_attempts_count' then
    update public.user_level_progress
    set failed_attempts_count = failed_attempts_count + 1,
        updated_at = now()
    where user_id = p_user_id and level_id = p_level_id;
  else
    raise exception 'Invalid column: %', p_column;
  end if;
end;
$$ language plpgsql security definer;

-- Prevent two IN_PROGRESS attempts for the same user on the same level
create unique index if not exists one_active_attempt_per_user_level
  on public.conversation_attempts (user_id, level_id)
  where status = 'IN_PROGRESS';

-- Fix starting trust for Level 1 (Dziecko Mila): was 45 in DB, should be 52
update public.game_levels
set starting_emotion_state = '{"trust":52,"suspicion":25,"patience":80}'::jsonb
where id = 1
  and starting_emotion_state->>'trust' = '45';
