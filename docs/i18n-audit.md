# i18n Audit: Hardcoded Polish Strings in ConvinceMe

Ten dokument zawiera pełne zestawienie miejsc w kodzie, w których język polski jest wpisany "na sztywno" (hardcoded). Pomoże to w przyszłej migracji projektu na wielojęzyczność (multilingual / i18n).

---

## 1. Warstwa Silnika Gry i Logiki Pomocniczej (`lib/game/`)

Te pliki zawierają teksty fabularne, instrukcje dla modeli LLM lub etykiety mechaniczne gry:

### [conversation-greetings.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/conversation-greetings.ts)
* **`GREETINGS_BY_LEVEL`**: Powitania początkowe dla poziomów 1–7 (np. *"Cześć, wędrowcze..."*).
* **`LOW_RENOWN_CALLBACKS`** i **`HIGH_RENOWN_CALLBACKS`**: Dodatkowe kwestie zależne od renomy gracza.
* Templet wypowiedzi o spotkaniu: *"Plotka o twoim spotkaniu z... dotarła tu wcześniej."*

### [reputation.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/reputation.ts)
* **`REPUTATION_INCIDENT_LABELS`**: Polskie nazwy incydentów (np. *"Nacisk na słowa"*, *"Obraźliwe słowa"*).
* **`REPUTATION_PRAISE_LABELS`**: Polskie nazwy pochwał (np. *"Delikatna opowieść"*, *"Uczciwy targ"*).
* **`REPUTATION_PLAYER_HELP`**: Tytuł i akapity wyjaśniające system renomy w HUD/Tooltip.
* **`formatRumorSummaryForNpc`**: Szablony tekstów plotek (np. *"Plotka: mówią, że ten podróżnik..."*).

### [defeat-copy.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/defeat-copy.ts)
* **`DEFEAT_MESSAGES`**: Teksty wyświetlane po przegranej (załamanie emocjonalne postaci) dla każdego poziomu (np. *"Mila ucieka w głąb lasu..."*).
* **`DEFEAT_THRESHOLDS_COPY`**: Tłumaczenia progów porażki (np. *"NPC jest skrajnie zirytowany"*).

### [character-speech.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/character-speech.ts)
* **`emotionSpeechInstruction`**: Dyrektywy promptowe tłumaczące stany emocjonalne na instrukcje aktorskie w języku polskim dla LLM (np. *"Mów z lekkim zniecierpliwieniem..."*).
* **`responseModeInstruction`**: Instrukcje zachowania w zależności od Response Mode (np. *"Stanowczo odmawiaj..."*).

### [coaching-hints.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/coaching-hints.ts)
* Cały system podpowiedzi trenera (Coaching/Whispers) posiada polskie teksty doradcze, analizy wypowiedzi gracza oraz podpowiedzi taktyczne.

### [defeat.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/defeat.ts)
* Nazwy powodów porażek przekazywane do UI (np. *"Obraza"*, *"Prowokacja"*, *"Niecierpliwość"*).

### [levels-client.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/levels-client.ts)
* Mapowanie poziomów trudności (`DIFFICULTY_MAP`): klucze `"łatwa"`, `"średnia"`, `"trudna"`.

### [mock-levels.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/game/mock-levels.ts)
* Dane poziomów pobierane w przypadku braku DB lub jako baza inicjalizacyjna:
  * Polskie nazwy postaci (`character_name`), tytuły (`title`), archetypy, opisy publiczne i cele (`goal`).

---

## 2. Pliki Konfiguracyjne i Fabularne (Lore)

### Dane bazy danych (Migracje Supabase)
* Pliki w katalogu [supabase/migrations/](file:///c:/Users/ziark/Projekty/ConvinceMe/supabase/migrations/):
  * Zawierają polskie definicje poziomów, celów i konfiguracji postaci wstrzykiwane do bazy przy migracji.

### Pliki z fragmentami Kroniki (Lore)
* [chronicle-entries.json](file:///c:/Users/ziark/Projekty/ConvinceMe/docs/lore/data/chronicle-entries.json):
  * Zawiera polskie teksty fragmentów Kroniki (odkrywanych fragmentów wiedzy) oraz ich powiązania logiczne.

---

## 3. Komponenty Interfejsu Użytkownika (`components/` i `app/`)

Te pliki zawierają statyczne etykiety interfejsu (buttons, headers, placeholdery):

### Komponenty Rozmowy i Gry (`components/game/`)
* **`defeat-modal.tsx`** i **`victory-modal.tsx`**: Etykiety zwycięstwa/porażki (np. *"Czas rozmowy"*, *"Kliknij, aby przejść dalej"*).
* **`coaching-whisper.tsx`**: Tekst *"Rada Sędziego"* oraz nagłówki sugestii.
* **`level-conversation-view.tsx`**: Pasek wpisywania tekstu, włączniki głosu (TTS/STT), stany ładowania (np. *"Postać myśli..."*).
* **`sage-key-guess-panel.tsx`**: Instrukcje i pola do wskazywania lokalizacji Kamienia Zapisu (poziom Mędrca).
* **`story-beat-screen.tsx`** i **`ending-slides.tsx`**: Polskie plansze narracyjne przed/po grze.

### Ekran Główny i Landing Page (`components/landing/`)
* [landing-hero.tsx](file:///c:/Users/ziark/Projekty/ConvinceMe/components/landing/landing-hero.tsx), [how-it-works.tsx](file:///c:/Users/ziark/Projekty/ConvinceMe/components/landing/how-it-works.tsx), [landing-cta.tsx](file:///c:/Users/ziark/Projekty/ConvinceMe/components/landing/landing-cta.tsx):
  * Hasła marketingowe, opisy mechaniki gry (np. *"Przekonaj ich słowem, nie siłą"*).
* **`character-carousel.tsx`**: Archetypy i opisy postaci na karuzeli.

### Autoryzacja i Profile (`app/login/` i `app/auth/`)
* Etykiety logowania, resetowania postępu, komunikatów walidacji formularzy (np. *"Błędny adres e-mail"*).

---

## 4. Prompty Systemowe (`lib/ai/`)

Silnik instruuje modele LLM w języku angielskim, lecz same definicje oczekiwanych zachowań językowych są powiązane z językiem polskim:
* System prompt sędziego w [prompts.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/ai/prompts.ts) i [psych-prompts.ts](file:///c:/Users/ziark/Projekty/ConvinceMe/lib/ai/psych-prompts.ts) nakazuje: *"Output must be in Polish"* / *"Polish dialogue"*.
