-- Backfill English (en) localized content for all seeded game_levels rows.
-- Source: current Polish values of title/character_name/archetype/short_description
-- and objective_config.hint, as established by the seed migration
-- (20250618000000_game_engine_foundation.sql) and later content updates
-- (20250619100000_mila_concession_and_backstory.sql,
--  20250619120000_levels_objectives_and_voice.sql,
--  20250621150000_systemic_lore_gates.sql,
--  20260626000004_fix_level1_concession.sql).
-- Character names reuse the English forms already established in
-- lib/i18n/messages/en.ts (Cunning Trader, Proud Knight, Stubborn Orc,
-- Bright Sage, Magnificent King) and the glossary (Milczenie -> Silence).

-- 1 dziecko-jablko
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Child Mila',
    'character_name', 'Child Mila',
    'archetype', 'Curious and sensitive',
    'objective_hint', 'Speak calmly, through stories or associations — don''t ask her directly about what she''s avoiding.',
    'publicDescription', 'She gets distracted and answers in a fairy-tale way.'
  )
)
where slug = 'dziecko-jablko';

-- 2 handlarz-amulet
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Cunning Trader',
    'character_name', 'Cunning Trader',
    'archetype', 'Born negotiator',
    'objective_hint', 'Show that you know the value of the goods and aren''t afraid to walk away without a deal.',
    'publicDescription', 'He treats every answer like an offer and always looks for an edge.'
  )
)
where slug = 'handlarz-amulet';

-- 3 rycerz-pomoc
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Proud Knight',
    'character_name', 'Proud Knight',
    'archetype', 'Guardian of honor',
    'objective_hint', 'Appeal to responsibility and honor, not to his weakness.',
    'publicDescription', 'He can''t stand pity and finds it very hard to admit weakness.'
  )
)
where slug = 'rycerz-pomoc';

-- 4 ork-rozejm
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Stubborn Orc',
    'character_name', 'Stubborn Orc',
    'archetype', 'Tough skeptic',
    'objective_hint', 'Speak short and direct — he''ll reject empty talk on his own.',
    'publicDescription', 'He respects courage, plain speech, and those who don''t go back on their word.'
  )
)
where slug = 'ork-rozejm';

-- 5 medrzec-klucz
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Bright Sage',
    'character_name', 'Bright Sage',
    'archetype', 'Master of riddles',
    'objective_hint', 'Don''t demand the key outright — lead him through his own metaphors.',
    'publicDescription', 'He answers a question with a question and tests the intentions of whoever he''s speaking with.'
  )
)
where slug = 'medrzec-klucz';

-- 6 krol-brama
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'Magnificent King',
    'character_name', 'Magnificent King',
    'archetype', 'Proud ruler',
    'objective_hint', 'Show that opening the gate serves the whole kingdom — not just you.',
    'publicDescription', 'He only listens to arguments worthy of the crown and won''t tolerate empty flattery.'
  )
)
where slug = 'krol-brama';

-- 7 bog-prawda
-- Note: character_name was updated to 'Bóg Milczenia' by
-- 20250621150000_systemic_lore_gates.sql, but the base `title` column
-- was never updated and still reads 'Bóg'. We mirror that same split here:
-- title translates the original 'Bóg', character_name translates the
-- current 'Bóg Milczenia' ("God of Silence", reusing glossary
-- Milczenie -> Silence).
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'God',
    'character_name', 'God of Silence',
    'archetype', 'The final trial',
    'objective_hint', 'Don''t accuse. Prove that silence was the kingdom''s convenient escape from guilt and atonement.',
    'publicDescription', 'He listens carefully, but he doesn''t give up the truth for free.'
  )
)
where slug = 'bog-prawda';
