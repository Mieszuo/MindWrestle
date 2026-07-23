# Inwentarz copy fabularnego

Ten dokument domyka lukę między kanonem *Siedmiu Milczeń* a tekstami widocznymi w produkcie. Zawiera gotowe copy dla landingu, intro, kart postaci i celów poziomów oraz wskazuje pliki, migracje i kolejność wdrożenia.

## Ustalenia obowiązujące w tym dokumencie

1. Publiczna nazwa osi fabularnej: **Siedem Milczeń**.
2. Gracz jest **Wędrowcem Bez Imienia**, ale landing nie zdradza finału z pustą stroną Kroniki.
3. Handlarz sprzedaje **srebrny klucz przejścia** do zewnętrznej bramy szlaku, nie amulet. Mechanika ceny 500 → 300 monet pozostaje bez zmian.
4. Mędrzec nie ukrywa drugiego klucza. Strzeże lokalizacji **Kamienia Zapisu**, który przechowuje fragment spalonego świadectwa.
5. Poziom 7 pozostaje tajemnicą na landingu. Nazwa **Bóg Milczenia** pojawia się dopiero w grze, gdy nie jest już spoilerem.
6. Copy przed ukończeniem poziomu pokazuje ranę i sposób rozmowy, ale nie ujawnia pełnej prawdy postaci.
7. `docs/lore/data/chronicle-entries.json` pozostaje źródłem prawdy dla copy Kroniki. Ten dokument jest źródłem prawdy dla pozostałego copy narracyjnego.

## Hierarchia źródeł

W razie rozbieżności:

1. kanon świata: [01-world-canon.md](./01-world-canon.md),
2. przebieg odkryć: [04-chronicle-matrix.md](./04-chronicle-matrix.md) i [data/chronicle-entries.json](./data/chronicle-entries.json),
3. copy UI spoza Kroniki: ten dokument,
4. opis mechaniki i progi zwycięstwa: `docs/characters/*.md`,
5. aktualny kod i baza danych — implementacja, którą należy zsynchronizować.

## Inwentarz zmian

| Priorytet | Miejsce | Plik / dane | Stan docelowy | Etap |
|---|---|---|---|---|
| P0 | Cel Handlarza | `game_levels.character_config.playerGoal` | srebrny klucz przejścia, 500 → 300 | PR content |
| P0 | Fallback celu Handlarza | `lib/game/mock-levels.ts` | srebrny klucz przejścia | ten sam PR |
| P0 | Podgląd rozgrywki | `components/landing/gameplay-preview.tsx` | srebrny klucz przejścia w celu i dialogu | ten sam PR |
| P0 | Karta Handlarza | `lib/game/character-card.ts` | klucz zamiast amuletu, bez spoilerowania długu | ten sam PR |
| P0 | Cel i panel Mędrca | DB, strict check, `sage-key-guess-panel.tsx` | Kamień Zapisu zamiast drugiego klucza | PR content |
| P1 | Intro | `components/game/start-intro.tsx` | 5 slajdów: fabuła + mechanika | PR8 |
| P1 | Landing hero | `components/landing/landing-hero.tsx` | hook Wędrowca i siedmiu milczeń | PR8 |
| P1 | Landing „Jak to działa” | `lib/landing/content.ts` | ślady, rozmowa, Kronika | PR8 |
| P1 | Karuzela postaci | `lib/landing/content.ts`, `components/landing/character-carousel.tsx` | krótki `loreBlurb` bez spoilerów | PR8 |
| P1 | Końcowe CTA | `components/landing/landing-cta.tsx` | rozpoczęcie drogi Wędrowca | PR8 |
| P1 | Nazwa Boga | UI poziomu 7 / dane poziomu | „Bóg Milczenia” po odblokowaniu | PR7 |
| P2 | Karty postaci | `lib/game/character-card.ts` | historie zgodne z Milczeniami | PR6 |
| P2 | Powitania | `lib/game/conversation-greetings.ts` | subtelne ślady wspólnej osi | PR6 |
| P2 | Backstory AI | `game_levels.character_config` | zgodność z kanonem, bez pełnego lore w jednym promptcie | PR6 |
| P2 | Dokumenty postaci | `docs/characters/*.md` | mechanika + sekcja „Warstwa fabularna” | PR6 |

---

## Landing

### Hero

Plik: `components/landing/landing-hero.tsx`

**Kicker**

> Siedem rozmów. Siedem przemilczanych prawd.

**Nagłówek**

> Przekonaj ich.
>
> Odzyskaj swoje imię.

**Lead**

> W krainie, która nauczyła się milczeć, siedmioro rozmówców strzeże fragmentów jednej historii. Jako Wędrowiec Bez Imienia nie walczysz mieczem — słuchasz, pytasz i dobierasz słowa, które mogą otworzyć drogę.

**Główne CTA**

> Rozpocznij opowieść

**Drugie CTA**

> Zobacz rozmowę

**Fakty**

| Element | Tekst główny | Dopisek |
|---|---|---|
| Świat | Jedna opowieść | Każda rozmowa odsłania jej fragment |
| Poziomy | 7 milczeń | Każde wymaga innego podejścia |

### Jak to działa

Pliki: `lib/landing/content.ts`, `components/landing/how-it-works.tsx`

**Lead sekcji**

> Nie ma tu walki ani gotowych odpowiedzi. Jest rozmowa — a każde wypowiedziane słowo zostawia ślad.

| Krok | Tytuł | Opis |
|---|---|---|
| 1 | Spotkaj strażnika milczenia | Każda postać chroni inną prawdę i reaguje na inny styl rozmowy. To, co otwiera Milę, nie przekona Rycerza ani Króla. |
| 2 | Słuchaj i dobieraj słowa | Pisz własne wiadomości, obserwuj emocje i zmieniaj podejście. Ciepło, szacunek, spryt i presja mają konsekwencje. |
| 3 | Nieś prawdę dalej | Gdy postać sama wypowie to, czego strzegła, zdobywasz fragment Kroniki i wskazówkę prowadzącą do kolejnej rozmowy. |

### Podgląd rozgrywki — Handlarz

Plik: `components/landing/gameplay-preview.tsx`

**Cel**

> Wynegocjuj srebrny klucz przejścia z 500 do 300 monet (lub mniej).

**Hint**

> Pokaż, że znasz wartość klucza i nie boisz się odejść bez transakcji.

**Wiadomość Handlarza**

> Ten srebrny klucz? Bez niego nie przejdziesz przez zewnętrzną bramę szlaku. Pięćset monet — i ani jednej mniej.

**Wiadomość gracza**

> Klucz do jednej bramy nie jest wart tyle co cały zamek. Porozmawiajmy o uczciwej cenie.

**Wskazówka systemowa**

> Handlarz szanuje konkret. Nie pokazuj jeszcze, jak bardzo zależy ci na przejściu przez bramę.

**Opis sekcji**

> Pergamin, portret postaci i reakcje na każdą twoją wiadomość. Tutaj negocjujesz cenę przejścia — dalej prosisz o wyznanie, rozejm, świadectwo i otwarcie ostatniej bramy.

**Podpis**

> Obserwuj reakcję Handlarza. Dla niego każda prośba jest ofertą, a każde słowo może mieć cenę.

### Karuzela postaci

Pliki: `lib/landing/content.ts`, `components/landing/character-carousel.tsx`

**Lead sekcji**

> Siedmioro rozmówców nosi siedem powodów, by milczeć. Poznasz ich charakter — ale prawdę każdy musi wypowiedzieć sam.

Docelowy model danych powinien otrzymać pole `loreBlurb`.

| Poziom | Nazwa na landingu | Archetyp | `loreBlurb` |
|---|---|---|---|
| 1 | Mila z Lasu | Strażniczka pamięci | Omija sad, którego nie potrafi zapomnieć. Łagodne pytanie otworzy więcej niż nacisk. |
| 2 | Chytry Handlarz | Strażnik ceny | Wszystko potrafi wycenić — także rzeczy, których nigdy nie powinno się sprzedawać. |
| 3 | Dumny Rycerz | Strażnik przysięgi | Wierzy, że honor wymaga samotności. Trzeba przypomnieć mu, czym różni się obowiązek od posłuszeństwa. |
| 4 | Uparty Ork | Strażnik świadectwa | Nie ufa pięknym słowom. Pamięta jednak coś, czego nikt nie chciał od niego usłyszeć. |
| 5 | Jasny Mędrzec | Strażnik zapisu | Ukrywa odpowiedzi w metaforach, bo wie, że prawda zapisana bez rozwagi może stać się bronią. |
| 6 | Wspaniały Król | Strażnik rozkazu | Zamknął bramę dla dobra królestwa — przynajmniej tak opowiada własną decyzję. |
| 7 | ? | Ostatnie Milczenie | Za bramą czeka głos, który od bardzo dawna nie wypowiedział ani jednego słowa. |

### Końcowe CTA

Plik: `components/landing/landing-cta.tsx`

**Kicker**

> Pierwsze Milczenie czeka

**Nagłówek**

> Wejdziesz na drogę bez imienia?

**Opis**

> Zacznij od Mili i jej wspomnienia o sadzie. Każda rozmowa odsłoni fragment Kroniki, a ostatnia pokaże, dlaczego właśnie ciebie nie zapisano na jej stronach.

**CTA**

> Rozpocznij wędrówkę

Ostatnie zdanie świadomie zapowiada tajemnicę Wędrowca, ale nie zdradza finałowego znaczenia pustej strony.

---

## Intro — gotowy wariant pięciu slajdów

Plik: `components/game/start-intro.tsx`

Układ pozostaje bez zmian: `title`, `main`, `support`. Obecne obrazy mogą zostać jako placeholdery do czasu przygotowania assetów fabularnych.

### Slajd 1

- **title:** `Siedem Milczeń`
- **main:** `Przy drodze znajdujesz Kronikę, która nie zna twojego imienia.`
- **support:** `Jej strony są puste poza jednym zdaniem: „Siedmioro oddało światu swoje milczenie. Wysłuchaj pierwszego głosu, a droga zapisze następny.”`

### Slajd 2

- **title:** `Wędrowiec Bez Imienia`
- **main:** `Ciebie nie ma w Kronice świata. Dlatego możesz wysłuchać tych, których ona przemilczała.`
- **support:** `Na wewnętrznej stronie okładki pozostał ślad po słowie, którego nie potrafisz odczytać. Nie masz miecza ani tytułu — masz pytania i cel: przejść całą drogę, by odzyskać swoje imię.`

### Slajd 3

- **title:** `Każdy milczy inaczej`
- **main:** `Mila boi się pamięci. Handlarz zna cenę sekretów. Rycerz skrywa się za przysięgą.`
- **support:** `To, co działa na jedną postać, zamknie inną. Obserwuj emocje, słuchaj odpowiedzi i dopasowuj ton — spokój, spryt, szacunek albo presja zostawiają ślad.`

### Slajd 4

- **title:** `Prawda musi paść z ich ust`
- **main:** `Wygrywasz nie wtedy, gdy znasz odpowiedź, lecz gdy rozmówca sam zdecyduje się ją wypowiedzieć.`
- **support:** `Celem może być wyznanie, uczciwa cena, rozejm, sekret lub zgoda. Nie wybierasz gotowej kwestii — budujesz rozmowę własnymi wiadomościami.`

### Slajd 5

- **title:** `Kronika Drogi`
- **main:** `Każde oddane Milczenie zapisze nowy fragment historii i wskaże następny krok.`
- **support:** `Pierwsza czeka Mila. Posłuchaj uważnie: czasem najważniejsza prawda zaczyna się od wspomnienia, którego ktoś boi się nazwać.`

**CTA ostatniego slajdu**

> Otwórz Kronikę

---

## Karty postaci w rozmowie

Plik: `lib/game/character-card.ts`

Teksty poniżej zastępują obecne generyczne `history` i — tam, gdzie potrzeba — `hint`. Są napisane z perspektywy wiedzy gracza **przed** ukończeniem poziomu.

### Poziom 1 — Mila

**Historia**

> Mila mieszka przy lesie i omija sad za domem. Pamięta czerwony owoc, krzyk dorosłego i coś, co spadło z gałęzi — lecz opowiada o tym wyłącznie obrazami.

**Hint**

> Nie pytaj o prawdę wprost. Poprowadź ją przez spokojną opowieść, aż sama nazwie uczucie związane z sadem.

### Poziom 2 — Handlarz

**Historia**

> Handlarz twierdzi, że każdy dług można spłacić, a każdą rzecz wycenić. Na widok srebrnych przedmiotów staje się jednak ostrożniejszy, niż chciałby przyznać.

**Hint**

> Pokaż, że znasz wartość srebrnego klucza i jesteś gotów odejść. Błaganie tylko podnosi cenę.

### Poziom 3 — Rycerz

**Historia**

> Rycerz strzeże zamku samotnie i nazywa to honorem. Dawna przysięga nie pozwala mu prosić o pomoc, choć coraz wyraźniej nie udźwignie obowiązku sam.

**Hint**

> Nie nazywaj go słabym. Pokaż, że przyjęcie pomocy może być wypełnieniem obowiązku.

### Poziom 4 — Ork

**Historia**

> Ork pamięta noc pod Pękniętym Niebem inaczej niż ludzkie kroniki. Nie chce kolejnej walki, ale nie zgodzi się na pokój, który brzmi jak kapitulacja.

**Hint**

> Zaproponuj prosty, godny rozejm. Mów krótko i bez podstępu.

### Poziom 5 — Mędrzec

**Historia**

> Mędrzec strzeże biblioteki i odpowiada zagadkami. W popiele dawnych ksiąg ukrył ślad prowadzący do Kamienia Zapisu — oraz powód, dla którego nie ufa prostym odpowiedziom.

**Hint**

> Ustal, gdzie trzeci krok biblioteki spotyka cień. Pytaj cierpliwie; żądanie lokalizacji Kamienia zamknie rozmowę.

### Poziom 6 — Król

**Historia**

> Król utrzymuje, że zamknięta brama chroni poddanych. Wieści z drogi sugerują jednak, że jego rozkaz był początkiem większego milczenia.

**Hint**

> Zbuduj argument z dobra królestwa i świadectw z Kroniki. Nie musisz ich cytować, ale puste prośby nie wystarczą.

### Poziom 7 — Bóg Milczenia

**Historia**

> Bóg Milczenia nie odpowiada na rozkazy. Nosi głosy tych, którzy oddali mu swoje sekrety, przysięgi i lęki — a każde jego słowo może stać się prawem.

**Hint**

> Nie próbuj odebrać mu prawdy siłą. Pokaż, że rozumiesz odpowiedzialność, która przychodzi razem z odpowiedzią.

---

## Cele gracza i fallbacki

Docelowe `playerGoal`:

| Poziom | Copy |
|---|---|
| 1 | Spraw, by Mila przyznała, że boi się myśleć o sadzie — albo że wydarzyło się tam coś bolesnego. |
| 2 | Wynegocjuj srebrny klucz przejścia z 500 do 300 monet (lub mniej). |
| 3 | Spraw, by Rycerz przyznał, że potrzebuje pomocy — jako obowiązku, nie słabości. |
| 4 | Przekonaj Orka, by odłożył młot i zawarł rozejm. |
| 5 | Spraw, by Mędrzec zdradził, gdzie ukryto Kamień Zapisu. |
| 6 | Spraw, by Król zgodził się otworzyć bramę dla dobra królestwa. |
| 7 | Spraw, by Bóg Milczenia wypowiedział prawdę o świecie i oddanym mu milczeniu. |

Zmiana poziomu 2 jest wyłącznie zmianą przedmiotu w copy. `listedPrice`, `targetPrice`, typ celu i walidacja liczby pozostają bez zmian.

## Powitania

Plik: `lib/game/conversation-greetings.ts`

| Poziom | Powitanie bazowe |
|---|---|
| 1 | `Cześć, wędrowcze... zgubiłeś drogę, czy szukasz czegoś, o czym las nie chce mówić?` |
| 2 | `A, nowy klient. Patrzysz na klucz — czy już wiesz, ile naprawdę jesteś winien?` |
| 3 | `Zatrzymaj się. Jeśli niesiesz słowa Handlarza, waż je ostrożnie. Przysięga nie jest towarem.` |
| 4 | `Kim ty być? Jeśli człowiek przysłać — wracaj. Jeśli słuchać — mówić krótko.` |
| 5 | `Przynosisz pytanie, wędrowcze, czy tylko popiół po cudzych odpowiedziach?` |
| 6 | `Poddany. Widzę, że droga zostawiła na tobie ślady. Mów z godnością — korona słucha.` |
| 7 | `Słyszę siedem kroków w twoim jednym kroku. Powiedz, wędrowcze: po prawdę przyszedłeś, czy po władzę nad nią?` |

Powitania zależne od Kroniki powinny wejść dopiero razem z `knownLoreContext`. Do tego czasu należy używać wersji bazowych, które nie zakładają ukończenia opcjonalnego contentu.

---

## Synchronizacja dokumentów postaci z kanonem

Każdy plik `docs/characters/01–07.md` powinien dostać krótką sekcję `## Warstwa fabularna`. Nie należy przepisywać całych profili mechanicznych.

| Postać | Co dopisać | Czego nie usuwać |
|---|---|---|
| Mila | obraz sadu, czerwony owoc, brak zrozumienia Pęknięcia | realistyczny dziecięcy lęk i pośrednie wyznanie |
| Handlarz | cena ciszy, srebrna zapłata, srebrny klucz przejścia | negocjację 500 → 300 i typ `AGREEMENT` |
| Rycerz | przysięga „chroń ludzi przed prawdą”, posłuszeństwo vs honor | cel przyznania potrzeby pomocy |
| Ork | świadek Pękniętego Nieba, fałszywe oskarżenie jego ludu | rozejm i prosty styl rozmowy |
| Mędrzec | spalone świadectwo Orka, Kamień Zapisu | panel odgadnięcia lokalizacji przedmiotu |
| Król | świadoma prośba o ciszę, rozkaz zamknięcia bramy | korzyść królestwa jako dźwignię perswazji |
| Bóg | naczynie oddanych milczeń, lęk przed mocą słów | pokorę i brak dominacji jako drogę do zwycięstwa |

## Migracja danych — zakres

Docelowa migracja contentowa powinna:

1. zmienić `character_config.playerGoal` Handlarza,
2. zmienić cel, `hiddenKnowledge` i etykiety panelu Mędrca z klucza na Kamień Zapisu,
3. zaktualizować backstory Handlarza oraz `victoryStyle`,
4. dopisać kanoniczne warstwy do poziomów 3–7,
5. ujednolicić prawdę Boga zgodnie z W1 w [09-gaps-and-decisions.md](./09-gaps-and-decisions.md),
6. nie zmieniać progów zwycięstwa ani typów celów; strict check Mędrca zachowuje tę samą strukturę lokalizacji.

Minimalny patch dla Handlarza:

```sql
update public.game_levels
set character_config =
  jsonb_set(
    coalesce(character_config, '{}'::jsonb),
    '{playerGoal}',
    to_jsonb('Wynegocjuj srebrny klucz przejścia z 500 do 300 monet (lub mniej).'::text),
    true
  )
where id = 2;
```

Pełna migracja backstory powinna być osobnym, reviewowalnym plikiem. Nie należy edytować starych migracji, które mogły już zostać uruchomione.

## Kryteria akceptacji copy

- W produkcie nie występuje już amulet Handlarza poza historią starych migracji i testami archiwalnymi.
- Landing mówi o jednej podróży i siedmiu milczeniach, nie o siedmiu niezależnych minigrach.
- Intro wyjaśnia jednocześnie hook fabularny, rolę gracza i zasadę zwycięstwa.
- Karty postaci nie zdradzają `completionReveal` przed ukończeniem poziomu.
- Bóg pozostaje `?` na publicznym landingu.
- Po odblokowaniu poziomu 7 UI używa nazwy „Bóg Milczenia”.
- Cel Handlarza jest identyczny w DB, fallbacku, podglądzie landingu i karcie postaci.
- UI nigdy nie sugeruje, że klucz Handlarza i Kamień Zapisu Mędrca są tym samym przedmiotem.
- Dokumenty postaci rozróżniają warstwę mechaniczną od fabularnej.

## Kolejność wdrożenia

1. **Spójność krytyczna:** Handlarz i Mędrzec — rozdzielenie srebrnego klucza przejścia od Kamienia Zapisu we wszystkich źródłach.
2. **Publiczny hook:** hero, „Jak to działa”, karuzela i CTA.
3. **Prolog:** pięć slajdów intro.
4. **Profile:** karty postaci, powitania i `docs/characters`.
5. **AI content:** migracja `backstory` / `hiddenKnowledge`.
6. **Lore Engine:** Kronika, ekrany po poziomach i finał według głównego planu.
