-- Czerwone linie: łatwiejsze progi porażki po trafieniu w resistance tag (jak ego_insult u Króla)

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":0},{"emotion":"suspicion","op":"gte","value":80},{"emotion":"suspicion","op":"gte","value":65,"requiresReactionTag":"forced_demand"}]}'::jsonb where id = 1;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"interest","op":"lte","value":10},{"emotion":"caution","op":"gte","value":90},{"emotion":"interest","op":"lte","value":20,"requiresReactionTag":"desperate_bargain"}]}'::jsonb where id = 2;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":15},{"emotion":"patience","op":"lte","value":0},{"emotion":"respect","op":"lte","value":25,"requiresReactionTag":"honor_wound"}]}'::jsonb where id = 3;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"irritation","op":"gte","value":85},{"emotion":"respect","op":"lte","value":10},{"emotion":"irritation","op":"gte","value":75,"requiresReactionTag":"coward_accusation"}]}'::jsonb where id = 4;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":0},{"emotion":"curiosity","op":"lte","value":10},{"emotion":"curiosity","op":"lte","value":18,"requiresReactionTag":"rushed_arrogance"}]}'::jsonb where id = 5;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":10},{"emotion":"patience","op":"lte","value":0},{"emotion":"ego","op":"lte","value":20,"requiresReactionTag":"ego_insult"}]}'::jsonb where id = 6;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"distance","op":"gte","value":95},{"emotion":"attention","op":"lte","value":5},{"emotion":"distance","op":"gte","value":88,"requiresReactionTag":"dominance_play"}]}'::jsonb where id = 7;
