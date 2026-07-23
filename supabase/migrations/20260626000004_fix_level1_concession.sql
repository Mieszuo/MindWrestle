-- Fix Level 1 objective: TARGET_UTTERANCE → CONCESSION (emotional confession about the orchard)
-- The original migration had a wrong objective type; the design intent is emotional CONCESSION, not word-guessing.

update public.game_levels
set objective_type = 'CONCESSION',
    objective_config = '{
      "type": "CONCESSION",
      "minimumGoalProgress": 18,
      "requiredState": {
        "trust": {"min": 40},
        "suspicion": {"max": 60},
        "patience": {"min": 15}
      }
    }'::jsonb
where id = 1;

-- Also fix hiddenKnowledge — "targetWord":"jabłko" should not be primary; the goal is about the orchard
update public.game_levels
set character_config = character_config || '{
  "hiddenKnowledge": {
    "painfulPlace": "sad za domem",
    "whatSheAvoids": "wspomnienie upadku i krzyku dorosłego",
    "whySheAvoidsIt": "Boi się, że mówienie o tym sprawi, że znów kogoś zawiedzie.",
    "triggerWord": "jabłko"
  },
  "victoryStyle": {
    "whenReady": "Przyznaje własnymi słowami, że boi się myśleć o sadzie lub że tam coś złego się stało — bez presji i bez rozkazu."
  }
}'::jsonb
where id = 1;
