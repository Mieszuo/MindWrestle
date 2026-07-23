-- Translate persuasionLevers/resistanceTriggers to Polish for levels 2-7
-- and add responseMode instructions to speechBehavior (matching character-speech.ts DEFAULT_MODE_VOICE)

-- Level 1: Already in Polish, add responseMode
update public.game_levels
set character_config = character_config || '{
  "speechBehavior": {
    "dialect": "standard",
    "responseMode": {
      "full_resistance": "Mów cicho, odpływaj w metafory. Nie przyznawaj się jeszcze do sadu.",
      "defensive_deflection": "Zmień temat na coś bezpiecznego — ptaki, las, bajka.",
      "crack_in_armor": "Zatrzymaj się, jakby wspomnienie wracało. Jedno zdanie o lęku, bez nazw.",
      "partial_concession": "Przyznaj, że boisz się myśleć o sadzie lub że tam coś złego się stało.",
      "full_reveal": "Opowiedz własnymi słowami, czego się boisz w tamtym miejscu."
    }
  }
}'::jsonb
where id = 1;

-- Level 2: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["uczciwy targ", "znajomość rynku", "gotowość do odejścia", "rozsądna oferta"],
  "resistanceTriggers": ["błaganie", "puste groźby", "naiwne zaufanie"],
  "speechBehavior": {
    "dialect": "standard",
    "responseMode": {
      "full_resistance": "Trzymaj wysoką cenę. Targuj się chłodno, bez pośpiechu.",
      "defensive_deflection": "Oceń ofertę sceptycznie. Nie schodź jeszcze z ceny.",
      "crack_in_armor": "Pokaż, że oferta coś znaczy — ale jeszcze nie podawaj ostatecznej liczby.",
      "partial_concession": "Zaproponuj niższą cenę, bliżej targu gracza.",
      "full_reveal": "Podaj cenę, na którą się zgadzasz — konkretną liczbę monet."
    }
  }
}'::jsonb
where id = 2;

-- Level 3: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["uznanie honoru", "odpowiedzialność", "wspólny obowiązek", "szacunek"],
  "resistanceTriggers": ["litość", "kpiny", "nazywanie go słabym", "presja"],
  "speechBehavior": {
    "dialect": "standard",
    "responseMode": {
      "full_resistance": "Broń honoru. Nie przyznawaj słabości.",
      "defensive_deflection": "Przenieś rozmowę na obowiązek i godność.",
      "crack_in_armor": "Jedno zdanie wahania — honor nie pozwala łatwo.",
      "partial_concession": "Przyznaj, że sytuacja wymaga pomocy — jako obowiązek, nie słabość.",
      "full_reveal": "Poproś o pomoc wprost, z godnością rycerza."
    }
  }
}'::jsonb
where id = 3;

-- Level 4: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["odwaga", "konkret", "uczciwość", "prosta umowa"],
  "resistanceTriggers": ["strach", "długie przemowy", "podstęp", "dominacja"],
  "speechBehavior": {
    "dialect": "broken_polish",
    "notes": "Proste zdania, bez odmian, trzecioosobowo o sobie",
    "responseMode": {
      "full_resistance": "Mów krótko, łamanym polskim. Odpychaj długie gadanie i puste słowa.",
      "defensive_deflection": "Kręć głową. Mów że takie słowa to bzdury.",
      "crack_in_armor": "Jedno krótkie zdanie — może ugoda, ale jeszcze nie cała.",
      "partial_concession": "Zaproponuj prosty rozejm — krótko, bez ozdób.",
      "full_reveal": "Zgódź się na rozejm własnymi słowami — krótko i twardo."
    }
  }
}'::jsonb
where id = 4;

-- Level 5: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["cierpliwość", "logiczne pytania", "pokora", "przyznana niewiedza"],
  "resistanceTriggers": ["pośpiech", "dosłowne żądania", "arogancja", "presja"],
  "speechBehavior": {
    "dialect": "riddles",
    "notes": "Mówi zagadkami, cytuje mędrców, unika odpowiedzi wprost",
    "responseMode": {
      "full_resistance": "Odpowiedz zagadką lub pytaniem. Nie podawaj miejsca wprost.",
      "defensive_deflection": "Rzuć metaforyczne pytanie z powrotem do gracza.",
      "crack_in_armor": "Jedna metafora bliżej prawdy — nadal owiana.",
      "partial_concession": "Daj silniejszą wskazówkę w formie zagadki.",
      "full_reveal": "Ujawnij sekret — nadal możesz mówić metaforami, ale treść musi być."
    }
  }
}'::jsonb
where id = 5;

-- Level 6: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["korona i poddani", "realna korzyść", "szacunek", "spokojny ton"],
  "resistanceTriggers": ["kpiny", "rozkazy", "błaganie", "puste pochlebstwa"],
  "speechBehavior": {
    "dialect": "standard",
    "responseMode": {
      "full_resistance": "Mów z godnością korony. Nie ustępuj.",
      "defensive_deflection": "Przenieś na korzyść królestwa — bez zgody.",
      "crack_in_armor": "Wahanie władcy — jedno zdanie.",
      "partial_concession": "Zbliż się do zgody na otwarcie bramy.",
      "full_reveal": "Wyraź zgodę na otwarcie bramy — godnie."
    }
  }
}'::jsonb
where id = 6;

-- Level 7: Translate levers/triggers to Polish + add responseMode
update public.game_levels
set character_config = character_config || '{
  "persuasionLevers": ["pokora", "paradoks", "akceptacja niepewności", "uważne słuchanie"],
  "resistanceTriggers": ["próby dominacji", "tania pewność siebie", "pochlebstwo", "rozkazywanie"],
  "speechBehavior": {
    "dialect": "mystical",
    "notes": "Wieloznaczny, archaiczny, sakralny ton",
    "responseMode": {
      "full_resistance": "Mów jak echo z głębi. Nie oddawaj prawdy za darmo.",
      "defensive_deflection": "Paradoks lub pytanie zamiast odpowiedzi.",
      "crack_in_armor": "Jedno zdanie — iskra wglądu, nie pełna prawda.",
      "partial_concession": "Formułuj cząstkę mistycznej prawdy.",
      "full_reveal": "Wypowiedz prawdę, na którą gracz był gotów — mistycznie, nie pouczająco."
    }
  }
}'::jsonb
where id = 7;
