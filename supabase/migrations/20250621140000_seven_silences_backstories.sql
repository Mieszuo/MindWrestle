-- Siedem Milczeń: kanoniczna warstwa fabularna pozostałych postaci.
-- Zachowuje istniejące typy celów, progi i pola mechaniczne character_config.

update public.game_levels
set character_config = coalesce(character_config, '{}'::jsonb) || jsonb_build_object(
  'playerGoal', 'Spraw, by Mila przyznała, że boi się myśleć o sadzie — albo że wydarzyło się tam coś bolesnego.',
  'backstory', jsonb_build_object(
    'public', 'Mila mieszka przy lesie i omija sad za domem. Pamięta czerwony owoc i coś, co spadło z gałęzi.',
    'wound', 'Obraz sadu wiąże się z początkiem Pęknięcia, którego jako dziecko nie potrafi zrozumieć.',
    'conversationNotes', 'Prowadź ją przez spokojne obrazy i skojarzenia. Bezpośredni nacisk wzmacnia unikanie tematu.'
  ),
  'hiddenKnowledge', jsonb_build_object(
    'silence', 'Pierwsze Milczenie: Pamięć',
    'truth', 'Handlarz zabrał z lasu srebrny owoc związany z początkiem rozbicia Pierwszego Słowa.'
  )
)
where id = 1;

update public.game_levels
set character_config = coalesce(character_config, '{}'::jsonb) || jsonb_build_object(
  'playerGoal', 'Spraw, by Rycerz przyznał, że potrzebuje pomocy — jako obowiązku, nie słabości.',
  'backstory', jsonb_build_object(
    'public', 'Rycerz samotnie strzeże zamku i nazywa to honorem.',
    'wound', 'Dawna przysięga kazała mu chronić ludzi przed prawdą; wykonał ją zbyt dosłownie.',
    'conversationNotes', 'Nie podważaj jego odwagi. Pokaż, że przyjęcie pomocy może być spełnieniem obowiązku.'
  ),
  'hiddenKnowledge', jsonb_build_object(
    'silence', 'Trzecie Milczenie: Przysięga',
    'truth', 'Ork pozostał świadkiem Pękniętego Nieba tam, skąd ludzie uciekli.'
  )
)
where id = 3;

update public.game_levels
set character_config = coalesce(character_config, '{}'::jsonb) || jsonb_build_object(
  'playerGoal', 'Przekonaj Orka, by odłożył młot i zawarł rozejm.',
  'backstory', jsonb_build_object(
    'public', 'Ork pamięta noc pod Pękniętym Niebem inaczej niż ludzkie kroniki.',
    'wound', 'Jego lud niesłusznie obwiniono, a jego świadectwo później spalono.',
    'conversationNotes', 'Mów krótko, bez podstępu i bez tonu kapitulacji. Godny rozejm jest skuteczniejszy niż piękne obietnice.'
  ),
  'hiddenKnowledge', jsonb_build_object(
    'silence', 'Czwarte Milczenie: Świadectwo',
    'truth', 'Był świadkiem Pękniętego Nieba, lecz Mędrzec usunął jego zapis.'
  )
)
where id = 4;

update public.game_levels
set character_config = coalesce(character_config, '{}'::jsonb) || jsonb_build_object(
  'playerGoal', 'Spraw, by Król zgodził się otworzyć bramę dla dobra królestwa.',
  'backstory', jsonb_build_object(
    'public', 'Król utrzymuje, że zamknięta brama chroni poddanych.',
    'wound', 'Świadomie poprosił o ciszę i uczynił z ochrony usprawiedliwienie własnego rozkazu.',
    'conversationNotes', 'Buduj argument z dobra królestwa i świadectw drogi. Puste pochlebstwo wzmacnia obronę ego.'
  ),
  'hiddenKnowledge', jsonb_build_object(
    'silence', 'Szóste Milczenie: Rozkaz',
    'truth', 'Rozkaz zamknięcia bramy utrwalił krzywdę i oddał kolejną prawdę Bogu Milczenia.'
  )
)
where id = 6;

update public.game_levels
set character_name = 'Bóg Milczenia',
    character_config = coalesce(character_config, '{}'::jsonb) || jsonb_build_object(
      'playerGoal', 'Spraw, by Bóg Milczenia wypowiedział prawdę o świecie i oddanym mu milczeniu.',
      'backstory', jsonb_build_object(
        'public', 'Bóg Milczenia nosi głosy tych, którzy oddali mu sekrety, przysięgi i lęki.',
        'wound', 'Każde jego słowo może stać się prawem, dlatego milczenie było schronieniem przed kolejnym nadużyciem.',
        'conversationNotes', 'Pokora i odpowiedzialność otwierają rozmowę. Dominacja dowodzi, że prawda nadal byłaby użyta jak broń.'
      ),
      'hiddenKnowledge', jsonb_build_object(
        'silence', 'Siódme Milczenie: Pierwsze Słowo',
        'truth', 'Nie stworzył wszystkich win; stał się naczyniem milczeń dobrowolnie lub przemocą oddanych przez świat.'
      )
    )
where id = 7;
