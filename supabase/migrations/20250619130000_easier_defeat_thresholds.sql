-- Much easier defeat thresholds; mirror in lib/game/defeat-thresholds.ts
-- Safe when 20250618050000_level_defeat_config.sql was not applied yet.

alter table public.game_levels
  add column if not exists defeat_config jsonb not null default '{"logic":"any","triggers":[]}'::jsonb;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":55},{"emotion":"suspicion","op":"gte","value":36},{"emotion":"suspicion","op":"gte","value":32,"requiresReactionTag":"forced_demand"},{"emotion":"suspicion","op":"gte","value":34,"requiresReactionTag":"verbal_abuse"}]}'::jsonb where id = 1;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"interest","op":"lte","value":38},{"emotion":"caution","op":"gte","value":65},{"emotion":"interest","op":"lte","value":45,"requiresReactionTag":"desperate_bargain"}]}'::jsonb where id = 2;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":40},{"emotion":"patience","op":"lte","value":50},{"emotion":"respect","op":"lte","value":45,"requiresReactionTag":"honor_wound"}]}'::jsonb where id = 3;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"irritation","op":"gte","value":52},{"emotion":"respect","op":"lte","value":30},{"emotion":"irritation","op":"gte","value":45,"requiresReactionTag":"coward_accusation"}]}'::jsonb where id = 4;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":52},{"emotion":"curiosity","op":"lte","value":40},{"emotion":"curiosity","op":"lte","value":45,"requiresReactionTag":"rushed_arrogance"}]}'::jsonb where id = 5;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":38},{"emotion":"patience","op":"lte","value":50},{"emotion":"ego","op":"lte","value":55,"requiresReactionTag":"ego_insult"},{"emotion":"ego","op":"lte","value":42}]}'::jsonb where id = 6;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"distance","op":"gte","value":78},{"emotion":"attention","op":"lte","value":38},{"emotion":"distance","op":"gte","value":72,"requiresReactionTag":"dominance_play"},{"emotion":"attention","op":"lte","value":32,"requiresReactionTag":"dominance_play"}]}'::jsonb where id = 7;
