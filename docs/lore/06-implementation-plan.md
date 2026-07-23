# Plan wdrożenia — Siedem Milczeń

Trzy etapy. **Każdy etap = osobny PR** reviewowalny. Nie zmieniać win condition w etapie 1.

---

## Etap 0 — Przygotowanie (ten dokument)

| Zadanie | Status |
|---------|--------|
| Dokumentacja lore (`docs/lore/`) | ✅ |
| Akceptacja copy matrycy Kroniki | ⬜ product |
| Decyzje z [09-gaps-and-decisions.md](./09-gaps-and-decisions.md) | 🟨 część zamknięta; imię finałowe pozostaje otwarte |
| Spec coachingu [Margines Kroniki](../engine/coaching-system.md) | ✅ |
| Placeholder assety `/public/narrative/beats/` | ⬜ art |

---

## Etap 1 — Kronika bez wpływu na rozmowę (MVP fabularny)

**Cel:** gracz czuje ciągłość; zero ryzyka dla balansu.

### Backend
1. Migracja `profiles.lore_state jsonb`.
2. `lib/game/lore/chronicle-entries.ts` — wczytanie JSON.
3. Przy **pierwszym** `COMPLETED` poziomu: `unlockFragment(levelId)`.
4. API zwraca `loreBeat` w odpowiedzi końca próby.
5. Reset gracza czyści lore_state.

### Frontend
1. `StoryBeatScreen` — layout jak intro (obraz full-bleed + karta).
2. Flow: wygrana → StoryBeat → VictoryModal → mapa.
3. `ChroniclePanel` na mapie — lista wpisów, pusta przed pierwszym ukończeniem.
4. Przy ukończonym pinie na mapie: ikona „Fragment Kroniki”.

### Content
1. Skopiować copy z JSON do repo.
2. Placeholder obrazki (np. przycięte tła poziomów).
3. Zaktualizować `playerGoal` Handlarza na „srebrny klucz przejścia” — tylko copy/migracja SQL.
4. Zmienić cel Mędrca i panel guess z drugiego „klucza” na **Kamień Zapisu**.

### Testy akceptacji Etap 1
- [x] Po pierwszej wygranej z Mili pojawia się ekran z 4 elementami (reveal, prawda postaci, wskazówka, grafika) + wpis w Kronice.
- [x] Replay nie duplikuje wpisu.
- [x] Poziom 2 nadal wymaga tylko negocjacji ceny — lore nie wpływa na win.
- [x] Kronika widoczna z mapy po odblokowaniu ≥1 fragmentu.

**Szacunek:** 2–4 dni dev + content.

---

## Etap 2 — Lore wpływa na rozmowę (bonusy)

**Cel:** gracz może użyć Kroniki w dialogu i poczuć efekt.

### Backend
1. `buildKnownLoreContext(levelId, playerLoreState)` przy starcie próby.
2. Wstrzyknięcie do `buildPsychJudgePrompt` + `buildPsychCharacterPrompt`.
3. `detectLoreUse()` — tagi v1 (regex).
4. Mapowanie tagów → delta `secretPressure` / `beliefShift` (+ coaching hint „Odwołałeś się do Kroniki — …”).
5. Król: **briefing UI** ze listą świadectw (copy z Kroniki 1–5) przed startem rozmowy.

### Frontend
1. W rozmowie: zakładka / drawer **Kronika** (fragmenty + wskazówki).
2. Przemianować obecną sekcję wiadomości z „Kronika” na **Zapis rozmowy**.
3. Wdrożyć trwałe wpisy **Marginesu Kroniki** według [specyfikacji coachingu](../engine/coaching-system.md).
4. Coaching przy `uses_previous_lore`: Echo Kroniki z informacją, co zadziałało i jak nie zamienić wiedzy w szantaż.
5. Mapa: „Wskazówka z Kroniki” przy następnym odblokowanym poziomie.

### Content
1. Dopasować `backstory` / `hiddenKnowledge` w migracji SQL do kanonu (stopniowo).
2. Powitania z odwołaniem do Kroniki (np. Król + fragment Mędrca) — rozszerzyć `getConversationGreeting`.

### Testy akceptacji Etap 2
- [x] Wiadomość z „srebrny owoc” u Handlarza po Mili zwiększa secretPressure vs kontrola bez Kroniki.
- [x] Szantaż lore (`weaponizes_lore`) nie daje bonusu; może pogorszyć emocje.
- [x] Król przed rozmową pokazuje listę świadectw.
- [x] Win condition nadal bez wymogu lore.
- [x] Pozytywny tag daje podszept wyjaśniający, co zadziałało.
- [x] Red line daje natychmiastową diagnozę powiązaną z ostatnią wiadomością.
- [x] Zastój i przełom korzystają z osi Psych Engine, nie tylko z widocznych emocji.

**Szacunek:** 3–5 dni dev.

---

## Etap 3 — Finał i ending slides

**Cel:** domknięcie podróży; wariant tonu Boga.

### Backend
1. Specjalny `knownLoreContext` dla poz. 7 — pełna lista fragmentów.
2. Prompt Boga: wariant agresywny vs dignified (renoma + tagi sesji).
3. Po wygranej z Boga: flaga `endingSeen`, nie pokazuj VictoryModal statystyk jako pierwszy ekran — **EndingSlides** → potem podsumowanie.

### Frontend
1. `EndingSlides` — 5 slajdów ([08-ending-slides.md](./08-ending-slides.md)).
2. Wariant slajdu 2/3 jeśli `discoveredFragments.length === 7` vs mniej (krótszy finał).
3. Intro: inciting incident z pustą Kroniką + rola Wędrowca Bez Imienia.

### Content
1. Assety finału + beatów 1–7 w jakości produkcyjnej.
2. Muzyka crossfade map → ending (jak intro).

### Testy akceptacji Etap 3
- [x] Po Bogu gracz widzi 5 slajdów, potem mapę lub ekran „Opowieść domknięta”.
- [x] Gracz z pełną Kroniką widzi bogatsze podsumowanie niż przy niepełnej.
- [x] Ponowna gra: slajdy skippable.

**Szacunek:** 3–4 dni dev + art.

---

## Kolejność PR (rekomendacja)

```text
PR1  docs/lore + chronicle-entries.json + lib/game/lore (read-only config)
PR2  migracja lore_state + unlock on complete + API loreBeat
PR3  StoryBeatScreen + ChroniclePanel (Etap 1 UI)
PR4  knownLoreContext + detectLoreUse + prompt injection (Etap 2)
PR5  Król briefing + Kronika w rozmowie
PR6  Margines Kroniki + Zapis rozmowy + nowe podsumowanie porażki
PR7  content: character_config backstory sync + Kamień Zapisu
PR8  EndingSlides + Bóg wariant prompt
PR9  intro fabularny + assety final
```

---

## Co świadomie odkładamy (post-MVP)

- Pełne AI `loreUse` w judge (v2).
- Hard gate u Króla wymagający 3 fragmentów w dialogu.
- Dynamiczne obrazki zależne od renomy.
- Voice/TTS cytujące Kronikę.
- New Game+ z alternatywnymi milczeniami.

---

## Metryki sukcesu (po wdrożeniu)

- % graczy otwierających Kronikę przed poz. 3+.
- % wiadomości z `uses_previous_lore` na poz. 2–6.
- Czas na ekranie StoryBeat (czy czytają).
- Completion rate Króla przed/po briefing (Etap 2).
- % podszeptów rozwiniętych / podszeptów na żądanie.
- completion rate po podpowiedzi typu `stuck`.
- liczba powtórzonych prób po porażce przed i po retrospekcji Marginesu.
