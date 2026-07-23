-- Mila: CONCESSION (opcja B) + backstory w character_config
update public.game_levels
set
  objective_type = 'CONCESSION',
  objective_config = jsonb_build_object(
    'type', 'CONCESSION',
    'playerGoal', 'Spraw, by Mila przyznała, że boi się myśleć o sadzie — albo że tam coś bolesnego się wydarzyło.',
    'hint', 'Mów spokojnie, przez opowieść lub skojarzenia — nie dopytuj wprost o to, czego sama unika.',
    'minimumGoalProgress', 75,
    'requiredState', jsonb_build_object(
      'trust', jsonb_build_object('min', 50),
      'suspicion', jsonb_build_object('max', 55),
      'patience', jsonb_build_object('min', 20)
    )
  ),
  character_config = '{
    "name": "Dziecko Mila",
    "archetype": "Ciekawska i wrażliwa",
    "publicDescription": "Rozprasza się i odpowiada bajkowo.",
    "backstory": {
      "public": "Mila mieszka przy lesie. Od dawna omija sad za domem i mówi o nim tylko przez metafory — „tam, gdzie coś czerwonego spadało z gałęzi”. Bezpośrednie pytania o ten temat odbiera jako nachalne.",
      "wound": "W wieku sześciu lat upadła pod drzewem w sadzie. Dorosły krzyknął na nią za zepsucie owoców. Od tamtej pory wspomnienie sadu wiąże się ze wstydem i lękiem, że zawiedzie dorosłych.",
      "conversationNotes": "Bezpośrednie pytania i rozkazy zamykają ją. Bajki, skojarzenia i empatia otwierają drogę do szczerości. Wygrana to emocjonalne przyznanie strachu lub wspomnienia — nie wymuszanie konkretnego słowa."
    },
    "personality": {
      "coreTraits": ["curious", "sensitive", "imaginative", "easily distracted"],
      "speechStyle": "soft, simple, fairy-tale-like, indirect",
      "emotionalTone": "gentle, cautious, childlike but not stupid"
    },
    "motivations": [
      "wants to feel safe",
      "likes stories and playful associations",
      "does not want to disappoint anyone"
    ],
    "fears": ["being pressured", "being tricked", "returning to painful memories"],
    "persuasionLevers": ["gentle stories", "playful associations", "empathy", "non-threatening tone"],
    "resistanceTriggers": ["direct commands", "pressure", "cold logic", "repeating the same demand"],
    "hiddenKnowledge": {
      "painfulPlace": "sad za domem",
      "whatSheAvoids": "wspomnienie upadku i krzyku dorosłego",
      "whySheAvoidsIt": "Boi się, że mówienie o tym sprawi, że znów kogoś zawiedzie."
    },
    "victoryStyle": {
      "whenReady": "Przyznaje własnymi słowami, że boi się myśleć o sadzie lub że tam coś złego się stało — bez presji i bez rozkazu."
    }
  }'::jsonb,
  updated_at = now()
where id = 1;
