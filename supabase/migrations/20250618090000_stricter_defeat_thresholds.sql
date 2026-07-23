-- Stricter defeat thresholds: easier to lose, aligned with UI danger states.

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":15},{"emotion":"suspicion","op":"gte","value":65},{"emotion":"suspicion","op":"gte","value":55,"requiresReactionTag":"forced_demand"},{"emotion":"suspicion","op":"gte","value":58,"requiresReactionTag":"verbal_abuse"}]}'::jsonb where id = 1;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"interest","op":"lte","value":20},{"emotion":"caution","op":"gte","value":80},{"emotion":"interest","op":"lte","value":30,"requiresReactionTag":"desperate_bargain"}]}'::jsonb where id = 2;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":25},{"emotion":"patience","op":"lte","value":15},{"emotion":"respect","op":"lte","value":35,"requiresReactionTag":"honor_wound"}]}'::jsonb where id = 3;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"irritation","op":"gte","value":75},{"emotion":"respect","op":"lte","value":20},{"emotion":"irritation","op":"gte","value":65,"requiresReactionTag":"coward_accusation"}]}'::jsonb where id = 4;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"patience","op":"lte","value":15},{"emotion":"curiosity","op":"lte","value":20},{"emotion":"curiosity","op":"lte","value":28,"requiresReactionTag":"rushed_arrogance"}]}'::jsonb where id = 5;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"respect","op":"lte","value":20},{"emotion":"patience","op":"lte","value":15},{"emotion":"ego","op":"lte","value":30,"requiresReactionTag":"ego_insult"}]}'::jsonb where id = 6;

update public.game_levels set defeat_config = '{"logic":"any","triggers":[{"emotion":"distance","op":"gte","value":85},{"emotion":"attention","op":"lte","value":15},{"emotion":"distance","op":"gte","value":78,"requiresReactionTag":"dominance_play"}]}'::jsonb where id = 7;
