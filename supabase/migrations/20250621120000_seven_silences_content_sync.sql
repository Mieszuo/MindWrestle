-- Siedem Milczeń: synchronizacja publicznego celu Handlarza i Kamienia Zapisu Mędrca.
-- Nie zmienia typów celów ani progów zwycięstwa.

update public.game_levels
set character_config =
  coalesce(character_config, '{}'::jsonb)
  || jsonb_build_object(
    'playerGoal', 'Wynegocjuj srebrny klucz przejścia z 500 do 300 monet (lub mniej).',
    'hint', 'Pokaż, że znasz wartość klucza i nie boisz się odejść bez transakcji.',
    'backstory', jsonb_build_object(
      'public', 'Sprzedaje srebrny klucz do zewnętrznej bramy szlaku. Zaczyna od wysokiej ceny i każdą prośbę traktuje jak ofertę.',
      'wound', 'Dawna srebrna zapłata przypomina mu o długu, którego nie potrafił uczciwie rozliczyć.',
      'conversationNotes', 'Otwiera się na konkretną wymianę, znajomość wartości i wiarygodną gotowość do odejścia.'
    ),
    'hiddenKnowledge', jsonb_build_object(
      'item', 'srebrny klucz przejścia',
      'itemPurpose', 'otwiera zewnętrzną bramę szlaku, ale nie Bramę Króla',
      'oldDebt', 'srebrny owoc z lasu był zapłatą za przeniesienie fragmentu Pierwszego Słowa w stronę korony'
    ),
    'victoryStyle', jsonb_build_object(
      'whenReady', 'Akceptuje konkretną cenę 300 monet lub mniej i oddaje srebrny klucz przejścia.'
    )
  )
where id = 2;

update public.game_levels
set character_config =
  coalesce(character_config, '{}'::jsonb)
  || jsonb_build_object(
    'playerGoal', 'Spraw, by Mędrzec zdradził, gdzie ukryto Kamień Zapisu.',
    'hint', 'Połącz obrazy Kamienia, cienia i trzeciego kroku biblioteki.',
    'backstory', jsonb_build_object(
      'public', 'Strażnik biblioteki zamku. Odpowiada zagadkami i strzeże śladów spalonego świadectwa.',
      'wound', 'Spalił świadectwo Orka, lecz nie potrafił zniszczyć go w całości. Ocalały fragment zamknął w Kamieniu Zapisu.',
      'conversationNotes', 'Pytaj cierpliwie i łącz jego obrazy. Żądanie lokalizacji wprost wzmacnia opór.'
    ),
    'hiddenKnowledge', jsonb_build_object(
      'recordStoneLocation', 'Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.',
      'revealKeywords', jsonb_build_array('trzeci krok', 'bibliotek', 'cień', 'kamień')
    ),
    'victoryStyle', jsonb_build_object(
      'whenReady', 'Ujawnia lokalizację Kamienia Zapisu, łącząc trzeci krok, bibliotekę, cień i kamień.'
    )
  )
where id = 5;
