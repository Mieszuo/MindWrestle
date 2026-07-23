-- Systemowe bramki lore: aktualizacja celów i konfiguracji postaci (Poziomy 5, 6, 7)
-- Wymuszenie mechanicznego użycia wiedzy zebranej z Kroniki

-- 5 Mędrzec (Miękki wstęp do syntezy)
update public.game_levels
set
  objective_config = jsonb_set(
    jsonb_set(
      jsonb_set(
        objective_config,
        '{playerGoal}',
        '"Wydobądź od Mędrca lokalizację Kamienia Zapisu. Połączenie wcześniejszych dowodów ułatwi zadanie."'::jsonb
      ),
      '{minimumLoreEvidenceCount}',
      '1'::jsonb
    ),
    '{genericPersuasionCanWin}',
    'true'::jsonb
  ),
  updated_at = now()
where id = 5;

-- 6 Król (Twardy dowód)
update public.game_levels
set
  objective_config = jsonb_set(
    jsonb_set(
      jsonb_set(
        objective_config,
        '{playerGoal}',
        '"Zmuś Króla do przyznania, że zamknął bramy ze strachu przed prawdą. Wymagane użycie min. 2 zebranych dowodów (np. oskarżenie Orków, przysięga Rycerza)."'::jsonb
      ),
      '{minimumLoreEvidenceCount}',
      '2'::jsonb
    ),
    '{genericPersuasionCanWin}',
    'false'::jsonb
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{
    "backstory": {
      "public": "Zbudował autorytet na spokoju i zamkniętych bramach po katastrofie.",
      "wound": "Zamknął królestwo przed prawdą z czystego strachu przed odpowiedzialnością i chaosem.",
      "conversationNotes": "Ignoruje pustą perswazję. Otworzy się tylko pod presją twardych dowodów z przeszłości."
    }
  }'::jsonb,
  updated_at = now()
where id = 6;

-- 7 Bóg Milczenia (Synteza, Odpowiedzialność i Kategorie Prawd)
update public.game_levels
set
  character_name = 'Bóg Milczenia',
  objective_config = jsonb_build_object(
    'type', 'CONCESSION',
    'playerGoal', 'Udowodnij Bogu Milczenia, że rozumiesz ucieczkę świata od prawdy. Użyj min. 4 dowodów z różnych perspektyw i przyjmij ciężar słów.',
    'hint', 'Nie oskarżaj. Udowodnij, że cisza była wygodną ucieczką królestwa od winy i zadośćuczynienia.',
    'minimumGoalProgress', 50,
    'minimumLoreEvidenceCount', 4,
    'requireLoreCategories', true,
    'genericPersuasionCanWin', false
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{
    "speechBehavior": { "dialect": "mystical" },
    "backstory": {
      "public": "Naczynie ludzkich lęków. Istota, która przyjęła niewypowiedziane słowa.",
      "wound": "Boi się, że ludzie znów użyją prawdy jako broni, tak jak podczas Pękniętego Nieba.",
      "conversationNotes": "Czeka na kogoś, kto zrozumie, że milczenie było ucieczką przed odpowiedzialnością. Odrzuca agresję."
    },
    "hiddenKnowledge": {
      "truthOfSilence": "Ludzie zgodzili się na ciszę, ponieważ prawda wymagałaby przyznania się do winy, naprawienia krzywd i utraty wygodnej wersji historii."
    }
  }'::jsonb,
  updated_at = now()
where id = 7;
