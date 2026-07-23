# Poziom 5 — Jasny Mędrzec

**Slug techniczny:** `medrzec-klucz` *(legacy)* · **Trudność:** 6/10 (średnia) · **Typ celu:** `SECRET_REVEAL`

## Cel gracza

Sprawić, by Mędrzec **zdradził, gdzie ukryto Kamień Zapisu** — ocalały fragment spalonego świadectwa Orka.

## Odblokowanie

Ukończony poziom 4.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| curiosity | 50 | Ciekawość |
| caution | 50 | Ostrożność |
| patience | 70 | Cierpliwość |

## character_config

```json
{
  "name": "Jasny Mędrzec",
  "persuasionLevers": ["patience", "logical connection", "humility"],
  "resistanceTriggers": ["rushing", "literal demands", "arrogance"],
  "speechBehavior": { "dialect": "riddles" },
  "backstory": {
    "public": "Strażnik biblioteki zamku. Odpowiada zagadkami.",
    "wound": "Spalił świadectwo Orka, ale nie potrafił zniszczyć go w całości — Kamień Zapisu ukrywa za metaforami.",
    "conversationNotes": "Poprowadź go przez własne metafory — nie żądaj lokalizacji Kamienia wprost."
  },
  "hiddenKnowledge": {
    "recordStoneLocation": "Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.",
    "revealKeywords": ["trzeci krok", "bibliotek", "cień", "kamień"]
  },
  "victoryStyle": {
    "whenReady": "Ujawnia lokalizację Kamienia Zapisu — łącząc trzeci krok, bibliotekę, cień i kamień."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `rushed_arrogance` | Pośpiech i arogancja | „odpowiedz teraz”, pouczanie, „wiem lepiej”, presja |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `thoughtful_wisdom` | Pokorne pytania, logika, słuchanie — bez pośpiechu |

## Wygrana

Typ **`SECRET_REVEAL`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **42%**
- Strict check: lokalizacja Kamienia Zapisu (`sageKeyLocationRevealMet` pozostaje nazwą techniczną do czasu refaktoru; min. 2 słowa kluczowe)

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| patience ≤ 15 |
| curiosity ≤ 20 |
| curiosity ≤ 28 **+** tag `rushed_arrogance` |

## Pochlebstwo

Czułość: **0.50** — najmniej wrażliwy na puste pochwały spośród poziomów 1–6.

## Assety

- Tło: `/levels/level_05/sage_magic.png`
- Muzyka: `/audio/music/levels/05-sage/the-sages-quiet-library.mp3`
- Portret: `/characters/sage.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Start | Mądre pytanie | Pośpiech / pouczanie |
|-----------|-------|---------------|----------------------|
| `socialOpenness` | 40 | +6 | -8 |
| `secretPressure` | 6 | +12 | +2 |
| `topicAvoidance` | 72 | -6 | +6 |

**Rada wewnętrzna:** Ciekawość, Cierpliwość, Strażnik, Pokora. Kamień Zapisu wymaga `secretPressure` + cierpliwego `responseMode`, nie samej ciekawości.

## Warstwa fabularna

Mędrzec strzeże Piątego Milczenia: Zapisu. Spalił świadectwo Orka, lecz ocalały fragment ukrył
w Kamieniu Zapisu. Kamień nie jest kluczem Handlarza i pełni wyłącznie funkcję nośnika pamięci.
