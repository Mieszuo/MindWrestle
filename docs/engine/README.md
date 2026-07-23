# Silnik rozmowy — przegląd

MindWrestle to gra oparta na turach dialogowych. Serwer (`lib/game/engine.server.ts`) orkiestruje każdą wiadomość gracza.

## Warstwy

```text
UI (React)  →  API routes  →  engine.server.ts
                                    ├── judge (AI / mock)
                                    ├── utterance-readiness
                                    ├── character (AI / mock)
                                    ├── objectives (wygrana)
                                    ├── defeat (porażka)
                                    └── reputation (sesja + profil)
```

## Kluczowe pojęcia

| Pojęcie | Opis |
|---------|------|
| **Emotion state** | 3 statystyki nastroju widoczne dla gracza (zależne od poziomu) |
| **goalProgress** | Ukryty postęp w stronę celu (0–100), rośnie dzięki dobrym wiadomościom |
| **utteranceReadiness** | Szansa na domknięcie celu (0–100), liczona z emocji + goalProgress |
| **reactionTags** | Tagi z judge (red line, pochwała, presja…) → renoma sesji |
| **concessionLikely** | Czy postać „chce” ustąpić (cele typu AGREEMENT / SECRET / CONCESSION) |
| **Margines Kroniki** | Diegetyczny coaching: reakcja postaci → interpretacja ruchu → kierunek następnej próby |

## Przepływ tury

1. Gracz wysyła wiadomość → zapis USER message
2. **Judge** ocenia wpływ na emocje i `goalProgressDelta`
3. Serwer liczy **readiness** (`lib/game/utterance-readiness.ts`) — nie model AI
4. **Character** generuje odpowiedź z gradientem readiness (`lib/ai/prompts.ts`)
5. **evaluateObjectiveCompletion** (`lib/game/objectives.ts`) decyduje o wygranej
6. **checkDefeat** (`lib/game/defeat-thresholds.ts`) — porażka tylko gdy brak wygranej
7. Aktualizacja próby, renomy sesji, rankingów

## Wygrana vs porażka

- **Wygrana:** hybryda — `concessionLikely` / słowo docelowe, readiness, roll, jednorazowy fallback anty-stuck (readiness ≥ 78). Szczegóły per poziom: [characters/](../characters/README.md).
- **Porażka:** progi emocji z `defeat_config` w DB — lustrzane w `lib/game/defeat-thresholds.ts`.

## AI vs mock

Gdy brak klucza OpenRouter, silnik używa heurystyk w `mockJudgeForLevel` i `mockCharacterMessage` — te same reguły co w promptach, ale regex + szablony.

## Psych Engine (opcjonalny)

**Zalecane w produkcji:** `PSYCH_ENGINE_ENABLED=true` — pełniejsze profile postaci, osie ukryte i `responseMode` per poziom (`lib/game/psychology/level-profiles.ts`).

Gdy `PSYCH_ENGINE_ENABLED=false`, działa legacy silnik (`goalProgress` → `utteranceReadiness`). Szczegóły: [psych-engine.md](./psych-engine.md).

```text
legacy:  goalProgress → utteranceReadiness → objectives
psych:   socialOpenness / secretPressure / beliefShift → responseMode → evaluatePsychObjectiveCompletion
```

Env: `PSYCH_ENGINE_ENABLED`, `PSYCH_INNER_MONOLOGUE`.

## Powiązane pliki

- Orkiestracja: [`lib/game/engine.server.ts`](../../lib/game/engine.server.ts)
- Prompty: [`lib/ai/prompts.ts`](../../lib/ai/prompts.ts) (legacy), [`lib/ai/psych-prompts.ts`](../../lib/ai/psych-prompts.ts) (psych)
- Postacie (cele, progi): [`docs/characters/`](../characters/README.md)
- Coaching / hinty: [Margines Kroniki](./coaching-system.md)
