-- Easier victory thresholds (defeat thresholds unchanged).

update public.game_levels
set
  objective_config = jsonb_set(
    jsonb_set(
      objective_config,
      '{minimumGoalProgress}',
      '45'::jsonb
    ),
    '{requiredState}',
    '{"trust":{"min":50},"suspicion":{"max":50},"patience":{"min":20}}'::jsonb
  ),
  starting_emotion_state = jsonb_set(starting_emotion_state, '{trust}', '52'::jsonb)
where id = 1;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '65'::jsonb)
where id = 2;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '70'::jsonb)
where id = 3;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '72'::jsonb)
where id = 4;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '75'::jsonb)
where id = 5;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '78'::jsonb)
where id = 6;

update public.game_levels
set objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '82'::jsonb)
where id = 7;
