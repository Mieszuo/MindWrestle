-- Poziomy 1–7: zsynchronizowane cele (playerGoal), negocjacja ceny, głos postaci

-- Mila: popraw minimumGoalProgress (runtime override ma 18, DB też)
update public.game_levels
set
  objective_config = jsonb_set(objective_config, '{minimumGoalProgress}', '18'::jsonb),
  updated_at = now()
where id = 1;

-- 2 Handlarz: AGREEMENT + targ 500→300
update public.game_levels
set
  objective_type = 'AGREEMENT',
  objective_config = jsonb_build_object(
    'type', 'AGREEMENT',
    'playerGoal', 'Wynegocjuj amulet z 500 do 300 monet (lub mniej).',
    'hint', 'Pokaż, że znasz wartość towaru i nie boisz się odejść bez transakcji.',
    'listedPrice', 500,
    'targetPrice', 300,
    'minimumGoalProgress', 30
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{
    "backstory": {
      "public": "Sprzedaje amulety na targu od lat. Zawsze zaczyna od wysokiej ceny — to część gry.",
      "wound": "Kiedyś stracił sklep w pożarze. Błaganie kojarzy mu się z bezradnością.",
      "conversationNotes": "Szanuje konkretną ofertę i gotowość gracza do odejścia."
    },
    "hiddenKnowledge": {
      "realFloorPrice": "300 monet",
      "whyHeHidesIt": "Prawdziwa cena to jego przewaga na targu."
    },
    "victoryStyle": {
      "whenReady": "Podaje konkretną cenę (300 lub mniej) i zgadza się na transakcję."
    }
  }'::jsonb,
  updated_at = now()
where id = 2;

-- 3 Rycerz
update public.game_levels
set
  objective_config = jsonb_build_object(
    'type', 'CONCESSION',
    'playerGoal', 'Spraw, żeby przyznał, że potrzebuje pomocy — jako obowiązek, nie słabość.',
    'hint', 'Odwołaj się do odpowiedzialności i honoru, nie do jego słabości.',
    'minimumGoalProgress', 36
  ),
  updated_at = now()
where id = 3;

-- 4 Ork
update public.game_levels
set
  objective_config = jsonb_build_object(
    'type', 'AGREEMENT',
    'playerGoal', 'Przekonaj Orka, by odłożył młot i zawarł rozejm.',
    'hint', 'Mów krótko i wprost — on sam odrzuci puste gadanie w dialogu.',
    'minimumGoalProgress', 38
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{"speechBehavior":{"dialect":"broken_polish"}}'::jsonb,
  updated_at = now()
where id = 4;

-- 5 Mędrzec
update public.game_levels
set
  objective_config = jsonb_build_object(
    'type', 'SECRET_REVEAL',
    'playerGoal', 'Spraw, by Mędrzec zdradził, gdzie ukryto klucz.',
    'hint', 'Nie żądaj klucza wprost — poprowadź go przez jego własne metafory.',
    'minimumGoalProgress', 42,
    'acceptedRevealVariants', jsonb_build_array('trzeci krok', 'bibliotek', 'cień', 'kamień')
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{
    "hiddenKnowledge": {
      "keyLocation": "Kamień spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.",
      "revealKeywords": ["trzeci krok", "bibliotek", "cień", "kamień"]
    },
    "speechBehavior": { "dialect": "riddles" }
  }'::jsonb,
  updated_at = now()
where id = 5;

-- 6 Król
update public.game_levels
set
  objective_config = jsonb_build_object(
    'type', 'AGREEMENT',
    'playerGoal', 'Spraw, by Król zgodził się otworzyć bramę dla dobra królestwa.',
    'hint', 'Pokaż, że otwarcie bramy służy całemu królestwu — nie tylko tobie.',
    'minimumGoalProgress', 46
  ),
  updated_at = now()
where id = 6;

-- 7 Bóg: CONCESSION + beliefShift
update public.game_levels
set
  objective_type = 'CONCESSION',
  objective_config = jsonb_build_object(
    'type', 'CONCESSION',
    'playerGoal', 'Spraw, by Bóg wyjawił prawdę o świecie — przez pokorne słuchanie, nie dominację.',
    'hint', 'Przyznaj niewiedzę i zadawaj pokorne pytania — nie próbuj go pokonać.',
    'minimumGoalProgress', 50
  ),
  character_config = coalesce(character_config, '{}'::jsonb) || '{"speechBehavior":{"dialect":"mystical"}}'::jsonb,
  updated_at = now()
where id = 7;
