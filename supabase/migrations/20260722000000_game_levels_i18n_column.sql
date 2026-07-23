alter table public.game_levels
  add column if not exists i18n jsonb not null default '{}'::jsonb;

comment on column public.game_levels.i18n is
  'Localized overrides, shape { "en": { title, character_name, archetype, objective_hint, publicDescription, backstory }, ... }. Base columns are the pl source/fallback.';
