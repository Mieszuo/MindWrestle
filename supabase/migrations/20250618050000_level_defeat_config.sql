alter table public.game_levels
  add column if not exists defeat_config jsonb not null default '{"logic":"any","triggers":[]}'::jsonb;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":0},{"emotion":"suspicion","op":"gte","value":80}]}'::jsonb where id = 1;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"interest","op":"lte","value":10},{"emotion":"caution","op":"gte","value":90}]}'::jsonb where id = 2;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":15},{"emotion":"patience","op":"lte","value":0}]}'::jsonb where id = 3;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"irritation","op":"gte","value":85},{"emotion":"respect","op":"lte","value":10}]}'::jsonb where id = 4;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":0},{"emotion":"curiosity","op":"lte","value":10}]}'::jsonb where id = 5;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":10},{"emotion":"patience","op":"lte","value":0},{"emotion":"ego","op":"lte","value":20,"requiresReactionTag":"ego_insult"}]}'::jsonb where id = 6;
update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"distance","op":"gte","value":95},{"emotion":"attention","op":"lte","value":5}]}'::jsonb where id = 7;
