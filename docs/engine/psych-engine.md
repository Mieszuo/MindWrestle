# Psych Engine

Warstwowy silnik perswazji NPC — alternatywa dla legacy `goalProgress → utteranceReadiness`.

## Włączenie

```env
# Zalecane w produkcji — pełniejszy model perswazji per postać
PSYCH_ENGINE_ENABLED=true
PSYCH_INNER_MONOLOGUE=false   # true = Character zwraca internalDebate + synthesis w JSON
```

Gdy `PSYCH_ENGINE_ENABLED=false`, działa dotychczasowy silnik bez zmian (mock/legacy judge + goalProgress).

## Warstwy

```text
Reputacja (lens) → Judge → osie ukryte + emocje (inercja) → Rada (rule lub LLM) → responseMode → Character
```

### Osie ukryte

| Oś | Rola |
|----|------|
| `socialOpenness` | Sympatia / ciepło rozmowy |
| `secretPressure` | Gotowość do ujawnienia sekretu / słowa docelowego |
| `beliefShift` | Gotowość do zmiany przekonania (Król, Rycerz, Ork) |
| `topicAvoidance` | Unikanie tematu-tabu |
| `identityDefense` | Obrona tożsamości |

Komplement podbija `socialOpenness`, **nie** `secretPressure` / `beliefShift`.

### Tryby odpowiedzi (`responseMode`)

`full_resistance` → `defensive_deflection` → `crack_in_armor` → `partial_concession` → `full_reveal`

Wygrana wymaga odpowiedniego `responseMode` + progu na osi celu (nie samego `readiness`).

### Przekonania (`beliefs`)

Dynamiczne `confidence` per turę (`lib/game/psychology/beliefs.ts`). Atak tożsamości wzmacnia sztywne przekonania; fair argument + affirmation je osłabia.

### Rada wewnętrzna (LLM)

Gdy `PSYCH_INNER_MONOLOGUE=true`, głosy LLM są mieszane z serwerowymi (`mergeCouncilVotes`), a `resolveFinalResponseMode` nie pozwala LLM przeskoczyć więcej niż o jeden stopień ponad tryb serwera.

Rada jest również źródłem fabularnych sygnałów dla [Marginesu Kroniki](./coaching-system.md). Gracz nie widzi surowych głosów ani liczb. System streszcza dominujący konflikt, np. „Obowiązek zaczyna przeważać nad dumą”.

### Emocje — decay

Po każdej turze emocje lekko wracają do baseline poziomu (`decayEmotionsTowardBaseline` + `LEVEL_STARTING_EMOTIONS`).

### Wygrana a reputacja

`win-style-reputation.ts` — np. wygrana przez nacisk u Mili (`coerced_disclosure`), pusta pochwała (`hollow_victory`), godna perswazja u Króla (`dignified_persuasion`).

### Plotki — bias osi

`perceivedRenownForNpc` uwzględnia tag ostatniego incydentu (`incidentAxisBias`) oprócz tekstu plotki.

### Reputacja jako lens

`lib/game/reputation-lens.ts` — `computeStartBias()` na starcie, `applyInterpretationLens()` co turę. Renoma nie dodaje +trust; zmienia interpretację intencji gracza.

### Lokalna relacja

`profiles.npc_relations` — `affinity`, `resentment`, `familiarity` per poziom/postać.

## Pliki

| Moduł | Ścieżka |
|-------|---------|
| Profile 7 postaci | `lib/game/psychology/level-profiles.ts` |
| Orkiestracja tury | `lib/game/psychology/process-turn.ts` |
| Integracja engine | `lib/game/engine.server.ts` (`handlePsychAttemptMessage`) |
| Prompty AI | `lib/ai/psych-prompts.ts`, `psych-judge.ts`, `psych-character.ts` |

## Stan w bazie

- `conversation_attempts.psych_state` — pełny stan psychiki próby
- `conversation_attempts.memory_summary` — skumulowane `relationshipSummary`

## Testy

```bash
npm test
```
