-- Backfill English (en) objective goals into game_levels.i18n.
-- The player-facing goal was previously read only from objective_config.playerGoal
-- (Polish); levels-client.ts now prefers i18n.<locale>.objective_goal. Source =
-- current Polish playerGoal values (seed + 20250619120000 + 20250621120000).

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Get Mila to admit she is afraid to think about the orchard — or that something painful happened there.'::text))
where slug = 'dziecko-jablko';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Negotiate the silver passage key down from 500 to 300 coins (or less).'::text))
where slug = 'handlarz-amulet';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Get him to admit he needs help — as a duty, not a weakness.'::text))
where slug = 'rycerz-pomoc';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Convince the Orc to lay down his hammer and agree to a truce.'::text))
where slug = 'ork-rozejm';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Get the Sage to reveal where the Stone of Record is hidden.'::text))
where slug = 'medrzec-klucz';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Get the King to agree to open the gate for the good of the kingdom.'::text))
where slug = 'krol-brama';

update public.game_levels
set i18n = jsonb_set(i18n, '{en,objective_goal}',
  to_jsonb('Get the God to reveal the truth about the world — through humble listening, not domination.'::text))
where slug = 'bog-prawda';
