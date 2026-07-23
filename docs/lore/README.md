# Fabuła — Siedem Milczeń

Dokumentacja projektu fabularnego MindWrestle: **jedna mistyczna podróż** przez siedem rozmów, gdzie każda postać chroni fragment prawdy o **Pierwszym Słowie** i **Bogu Milczenia**.

## Zasada nadrzędna

```text
Psych Engine     → czy postać emocjonalnie pęka
Objective Judge  → czy cel poziomu został spełniony
Renoma           → jak świat ocenia styl Wędrowca (nacisk, szacunek, spryt…)
Kronika          → jaką prawdę Wędrowiec niesie dalej (treść między poziomami)
```

**Core loop rozmowy się nie zmienia.** Fabuła to warstwa nad silnikiem: odkrycia, ekrany po poziomie, wstrzykiwanie `knownLoreContext` do promptów, opcjonalne bonusy za użycie Kroniki w dialogu.

## Indeks dokumentów

| # | Dokument | Dla kogo | Zawartość |
|---|----------|----------|-----------|
| 1 | [Kanoniczna prawda świata](./01-world-canon.md) | autorzy fabuły, prompty Boga/Mędrca | Pełna prawda (nigdy w całości dla gracza) |
| 2 | [Wędrowiec Bez Imienia](./02-wanderer.md) | intro, finał, copy UI | Kim jest gracz i dlaczego rozmawia |
| 3 | [Oś Siedmiu Milczeń](./03-seven-silences.md) | wszystkie poziomy | Tabela arc + powiązania między postaciami |
| 4 | [Matryca Kroniki (poziomy 1–7)](./04-chronicle-matrix.md) | content + implementacja | Reveals, wskazówki, wpisy, grafiki, JSON |
| 5 | [Spec Lore Engine](./05-lore-engine-spec.md) | backend / AI | Typy, API, prompty, tagi, przepływ danych |
| 6 | [Plan wdrożenia](./06-implementation-plan.md) | cały zespół | Etapy 1–3, kolejność PR, testy akceptacji |
| 7 | [Spec UI fabularnego](./07-ui-spec.md) | frontend | Ekran po poziomie, Kronika, mapa, finał |
| 8 | [Slajdy zakończenia](./08-ending-slides.md) | content + frontend | 5 slajdów po Bogu (+ warianty) |
| 9 | [Luki, ryzyka, decyzje](./09-gaps-and-decisions.md) | product | Słabe punkty, otwarte pytania, rekomendacje |
| 10 | [Inwentarz copy fabularnego](./10-copy-inventory.md) | content + frontend + AI | Gotowe teksty landingu, intro, kart postaci i migracji |
| 11 | [Dane Kroniki (JSON)](./data/chronicle-entries.json) | kod | Maszyna do czytania — źródło prawdy copy Kroniki |

## Powiązane dokumenty

- [Silnik rozmowy](../engine/README.md) — emocje, wygrana, renoma
- [Psych Engine](../engine/psych-engine.md) — osie ukryte, responseMode
- [Margines Kroniki](../engine/coaching-system.md) — żywy coaching i hinty w rozmowie
- [Indeks postaci](../characters/README.md) — cele mechaniczne per poziom

## Status

| Element | Status |
|---------|--------|
| Dokumentacja fabuły | ✅ ten folder |
| `PlayerLoreState` w profilu | ⬜ do wdrożenia |
| Ekran po poziomie | ⬜ do wdrożenia |
| `knownLoreContext` w promptach | ⬜ do wdrożenia |
| Tagi lore w Judge | ⬜ do wdrożenia |
| Slajdy finału | ⬜ do wdrożenia |
| Assety graficzne beatów | ⬜ do wygenerowania |
| Inwentarz copy UI | ✅ [gotowy](./10-copy-inventory.md) |
| Spec żywego coachingu | ✅ [Margines Kroniki](../engine/coaching-system.md) |

## Szybki start dla implementatora

1. Przeczytaj [01-world-canon.md](./01-world-canon.md), [09-gaps-and-decisions.md](./09-gaps-and-decisions.md), [10-copy-inventory.md](./10-copy-inventory.md) i [spec coachingu](../engine/coaching-system.md).
2. Skopiuj strukturę z [data/chronicle-entries.json](./data/chronicle-entries.json) do `lib/game/lore/` (etap 1 planu).
3. Etap 1 planu: tylko zapis fragmentów + ekran po wygranej — **bez** zmiany win condition.
4. Etap 2: tagi lore + bonusy w Judge/Psych Engine.
5. Etap 3: finał Boga + slajdy zależne od Kroniki.
