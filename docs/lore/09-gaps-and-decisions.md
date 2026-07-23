# Luki, ryzyka i decyzje do podjęcia

Przed kodowaniem Etapu 1 warto zamknąć lub świadomie odłożyć poniższe punkty.

---

## Decyzje produktowe (blokują copy)

### D1 — Handlarz: amulet vs klucz przejścia vs srebrna pieczęć

| Opcja | Plus | Minus |
|-------|------|-------|
| Zostawić **amulet** mechanicznie, lore o srebrnym owocu | zero migracji celu | rozjazd copy vs negocjacja „amuletu” |
| **Srebrny klucz przejścia** (500→300) | czytelny fizyczny cel i droga do zamku | wymaga migracji `playerGoal` + landing preview |
| **Srebrna pieczęć** (metafora) | łączy Mila–Handlarz–Król | mniej oczywiste dla gracza |

**Rekomendacja:** srebrny klucz przejścia w copy + negocjacja bez zmiany typu AGREEMENT. Amulet w landingu i preview zaktualizować osobno.

**Status:** ✅ przyjęte dla copy v1 — **srebrny klucz przejścia**; patrz [10-copy-inventory.md](./10-copy-inventory.md)

---

### D2 — Imię Wędrowca na slajdzie 3

**Rekomendacja v1:** opcjonalne `display_name`; inaczej abstrakcyjne „Wędrowiec”.

**Status:** ⬜ decyzja finałowa nadal otwarta; intro v1 używa tytułu „Wędrowiec Bez Imienia”, bez nadawania imienia

---

### D3 — Tytuł publiczny motywu

- *Siedem Milczeń* (krótkie)
- *Siedem Słów Milczenia* (literackie)

**Rekomendacja:** UI „Siedem Milczeń”, podtytuł w Kronice „Siedem Słów Milczenia”.

**Status:** ✅ przyjęte dla copy v1 — UI używa **Siedem Milczeń**; patrz [10-copy-inventory.md](./10-copy-inventory.md)

---

### D4 — Kiedy wydarzyło się Pęknięte Niebo

**Decyzja:** **siedem lat przed rozpoczęciem gry**.

To pozwala wszystkim siedmiu rozmówcom być żyjącymi świadkami tego samego wydarzenia. Mila była wtedy bardzo mała i pamięta obrazy, nie znaczenie. Usunąć copy o „pierwszym słowie po tysiącu lat”.

**Status:** ✅ przyjęte; zapisane w [01-world-canon.md](./01-world-canon.md)

---

### D5 — Klucz Handlarza vs przedmiot Mędrca

**Decyzja:**

- Handlarz sprzedaje **srebrny klucz przejścia** do zewnętrznej bramy szlaku.
- Mędrzec ujawnia lokalizację **Kamienia Zapisu**, który przechowuje fragment spalonego świadectwa.
- Król otwiera własną bramę decyzją; żaden przedmiot nie zastępuje jego zgody.

**Status:** ✅ przyjęte; wymaga migracji celu i strict checku poziomu 5

---

## Słabe punkty fabularne (do dopracowania w copy)

### W1 — „Pierwsze Słowo” vs obecny cel Boga

Sędzia celu Boga wymaga **substancji o świecie** (`worldTruth`, warstwa rzeczywistości w hiddenKnowledge). Kanon mówi o **milczeniu oddanym Bogu**.

**Ryzyko:** finał brzmi jak dwie prawdy (warstwy + milczenie).

**Naprawa:** w `hiddenKnowledge` / victoryStyle Boga **zunifikować**:
> Prawda: ludzie oddali Bogu milczenie, bo bali się mocy własnych słów; świat, który widzą, istnieje w cieniu niewypowiedzianego.

Jeden akapit kanonu w migracji SQL — **PR content**, nie silnik.

---

### W2 — Mędrzec: guess panel vs „jedno słowo z sakwy”

Obecna mechanika: **odgadnięcie lokalizacji** (trzeci krok, biblioteka…). Fabuła mówi o **spalonym świadectwie**, Kamieniu Zapisu i popiele.

**Ryzyko:** gracz myśli „gra w chowanego”, nie „milczenie zapisu”.

**Naprawa v1 (bez zmiany mechaniki):**  
Copy Kroniki i Mędrca mówią o popiele; guess = „gdzie ukryto **Kamień Zapisu**”.

**Naprawa v2 (później):** TARGET_UTTERANCE jedno słowo + usunięcie guess panelu.

**Rekomendacja:** v1 na Etap 1–2; v2 osobny PR.

---

### W3 — Król: briefing vs brak hard gate

Briefing obiecuje korzyść ze świadectw, ale silnik **nie wymaga** cytowania.

**Ryzyko:** gracz czuje się oszukany, jeśli wygra bez Kroniki a briefing sugerował wymóg.

**Naprawa:** copy briefing **explicite**: „ułatwia, nie wymaga”. Etap 2: mierzalny bonus (+pressure), nie blokada.

---

### W4 — Ork a „Pęknięte Niebo”

Termin nie pada w obecnym `character_config` Orka.

**Naprawa:** dodać w backstory Orka i Mędrca w migracji; opcjonalnie tag lore `shattered_sky` w detectLoreUse.

---

### W5 — Spójność Mili (wstyd vs Pierwsze Słowo)

Obecna rana Mili: upadek, krzyk dorosłego za jabłka — **realistyczna**, nie mistyczna.

**Ryzyko:** kanon „początek Pęknięcia” vs „wstyd dziecka”.

**Naprawa (rekomendowana):**  
Mila pamięta **obraz** (czerwony owoc, krzyk) — **nie wie**, że to Pęknięcie. Dorosły krzyk = ludzka reakcja na coś, czego nie rozumie. Nie przepisywać na magię jabłko — **nakład interpretacji** dopiero w Kronice Handlarza/Mędrca.

---

### W6 — Sukces mechaniczny nie uruchamia naturalnie revealu

Negocjacja ceny, rozejm albo zgoda na pomoc nie muszą logicznie prowadzić do ujawnienia prawdy o Pęknięciu.

**Ryzyko:** ekran Kroniki wygląda jak informacja od narratora, której postać nigdy nie wypowiedziała ani nie zasugerowała.

**Naprawa:** każdy poziom dostaje `bridgeReveal` — jedną krótką wypowiedź lub gest NPC po spełnieniu celu mechanicznego, przed `StoryBeatScreen`.

Przykład Handlarza:

> „Trzysta. I weź klucz. Srebrne rzeczy już raz kosztowały mnie więcej, niż powinny.”

Flow:

```text
spełnienie celu → bridgeReveal postaci → StoryBeat → wynik próby
```

`bridgeReveal` nie jest nowym warunkiem zwycięstwa. Jest narracyjnym mostem do Kroniki.

---

### W7 — Zrozumienie nie może oznaczać rozgrzeszenia

Król świadomie poprosił o ciszę, a lud Orka został fałszywie obwiniony.

**Ryzyko:** finał „każde milczenie miało powód” spłaszcza odpowiedzialność i sugeruje, że wszystkie krzywdy były równoważne.

**Naprawa:** epilog rozróżnia wyjaśnienie od usprawiedliwienia. Król przyznaje winę, świadectwo Orka wraca do oficjalnej Kroniki, a otwarcie bramy jest początkiem naprawy, nie pełnym odkupieniem.

---

## Ryzyka techniczne

### T1 — Rozmiar promptów

7 fragmentów × bullet points + character_config + psych state = **duży prompt**.

**Mitigacja:** max 3–5 bulletów skróconych na poziom; tylko `promptBullets`, nie pełne chronicleEntry.

---

### T2 — Detekcja lore regex po polskim

Gracze piszą kreatywnie; false negative/positive.

**Mitigacja:** v1 bonus mały (+5); v2 AI `loreUse`; coaching „spróbuj odwołać się do…” bez kar za miss.

---

### T3 — Desync docs ↔ JSON ↔ DB character_config

Trzy źródła prawdy.

**Mitigacja:**  
- copy fabularne: **JSON w repo** (`lib/game/lore/data/chronicle-entries.json`),  
- psychologia postaci: migracje SQL,  
- docs: mirror + changelog w PR.

---

### T4 — Reset gracza

`/api/player/reset` musi czyścić `lore_state` — inaczej Kronika z poprzedniej runy.

---

### T5 — Admin / analytics

Nowe pole profilu — opcjonalnie log `fragment_unlocked` (PostHog) w Etap 2.

---

## Ryzyka UX

### U1 — Zbyt dużo tekstu po każdym poziomie

StoryBeat + VictoryModal = dwa modale.

**Mitigacja:** StoryBeat max ~120 słów; „Pomiń do wyniku” link.

---

### U2 — Spoiler w Kronice przed grą w poziom

Gracz czyta wskazówkę do Handlarza przed Mila jeśli otworzy Kronikę… — **nie**, Kronika pokazuje tylko **odblokowane** wpisy. Wskazówka N jest widoczna dopiero po ukończeniu N.

---

### U3 — Trzy konkurujące systemy pomocy

Widoczne nastroje, statyczny hint z karty i znikający `CoachingWhisper` przekazują podobne informacje, ale żaden nie wyjaśnia pełnego związku między ruchem gracza i reakcją postaci.

**Naprawa:** wdrożyć [Margines Kroniki](../engine/coaching-system.md):

- nastroje = stan,
- Margines = przyczyna + interpretacja + kierunek,
- karta postaci = strategia ogólna / ostatni podszept,
- porażka = jedna retrospekcja, nie trzy niezależne hinty.

---

### U4 — „Kronika” nazywa dwie różne rzeczy

Obecnie sekcja wiadomości w pergaminie nosi nazwę „Kronika”, a plan fabularny używa tej samej nazwy dla dziennika odkrytych prawd.

**Naprawa:** historia bieżącego dialogu = **Zapis rozmowy**.
Stały dziennik między poziomami = **Kronika Drogi**.

---

### U5 — Startowe nastroje brzmią jak trwająca porażka

Przed pierwszą wiadomością copy może mówić „tracisz uwagę”, „bardzo czujny”, „nie widzi sensu wymiany”.

**Naprawa:** osobny neutralny wariant copy dla `turnsCount === 0`, np. „ocenia nowego klienta”, „ostrożny z natury”, „czeka na pierwszą ofertę”.

---

## Checklist przed Etapem 1 kod

- [x] D1: klucz vs amulet — **srebrny klucz przejścia**
- [ ] D2: imię na slajdzie 3
- [x] D3: tytuł motywu w UI — **Siedem Milczeń**
- [x] D4: oś czasu — **Pęknięcie siedem lat temu**
- [x] D5: Handlarz = srebrny klucz przejścia; Mędrzec = Kamień Zapisu
- [ ] Akceptacja copy w `chronicle-entries.json`
- [ ] Placeholder assety lub fallback
- [ ] W1: ujednolicenie prawdy Boga w migracji (może być PR6)
- [ ] W6: `bridgeReveal` dla poziomów 1–7
- [ ] U3–U5: wdrożenie Marginesu i rozdzielenie nazw UI

---

## Co jest już dobrze dopasowane (nie ruszać bez powodu)

- Liniowość poziomów = kolejność milczeń.
- CONCESSION / AGREEMENT typy celów per postać.
- Renoma oddzielnie od Kroniki — **zachować**.
- Wędrowiec bez backstory w promptach — **zachować**; fabuła przez Kronikę + finał.
- Psych Engine jako warstwa emocji — lore tylko bonus.
