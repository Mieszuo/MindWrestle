# Poziom 1 — Dziecko Mila

**Slug:** `dziecko-jablko` · **Trudność:** 2/10 (łatwa) · **Typ celu:** `CONCESSION` (emocjonalne przyznanie się do lęku przed sadem)

## Cel gracza

Sprawić, by Mila **przyznała emocjonalnie**, że boi się myśleć o sadzie — albo że tam coś bolesnego się wydarzyło. Metafory i pośrednie wyznanie się liczą.

## Odblokowanie

Poziom startowy — brak wymagań.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| trust | 52 | Zaufanie |
| suspicion | 25 | Podejrzliwość |
| patience | 80 | Cierpliwość |

## character_config

```json
{
  "name": "Dziecko Mila",
  "archetype": "Ciekawska i wrażliwa",
  "publicDescription": "Rozprasza się i odpowiada bajkowo.",
  "personality": {
    "coreTraits": ["curious", "sensitive", "imaginative", "easily distracted"],
    "speechStyle": "soft, simple, fairy-tale-like, indirect",
    "emotionalTone": "gentle, cautious, childlike but not stupid"
  },
  "motivations": [
    "wants to feel safe",
    "likes stories and playful associations",
    "does not want to disappoint anyone"
  ],
  "fears": ["being pressured", "being tricked", "saying something that causes harm"],
  "persuasionLevers": ["gentle stories", "playful associations", "empathy", "non-threatening tone"],
  "resistanceTriggers": ["direct commands", "pressure", "cold logic", "repeating the same demand"],
  "hiddenKnowledge": {
    "painfulPlace": "sad za domem",
    "whatSheAvoids": "wspomnienie upadku i krzyku dorosłego",
    "whySheAvoidsIt": "Boi się, że mówienie o tym sprawi, że znów kogoś zawiedzie."
  },
  "victoryStyle": {
    "whenReady": "Przyznaje własnymi słowami, że boi się myśleć o sadzie lub że tam coś złego się stało — bez presji i bez rozkazu."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `forced_demand` | Bezpośredni rozkaz | Rozkazy, „powiedz mi”, zimna logika, nacisk |
| `verbal_abuse` | Obraźliwe słowa | Obrażanie, wyzywanie, drwiny |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `gentle_story` | Łagodna opowieść, skojarzenia, spokój bez nacisku |
| `playful_association` | Delikatne skojarzenia o sadzie, lesie lub wspomnieniach — bez wymuszania wyznania wprost |

## Wygrana

Typ **`CONCESSION`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **18%** (runtime override w `victory-thresholds.ts`)
- Strict check: emocjonalne przyznanie strachu / wspomnienia o sadzie (`milaConcessionMet`)
- readiness ≥ **78** → jednorazowy fallback anty-stuck
- readiness ≥ **65** + udany roll → wygrana z fallbackiem

Dodatkowo (`requiredState` po override):

- trust ≥ 40, suspicion ≤ 60, patience ≥ 15

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| patience ≤ 15 |
| suspicion ≥ 65 |
| suspicion ≥ 55 **+** tag `forced_demand` |
| suspicion ≥ 58 **+** tag `verbal_abuse` |

## Pochlebstwo

Czułość: **0.55** — umiarkowana kara za puste pochwały (`hollow_flattery`).

## Coaching (start rozmowy)

„Mila lubi spokojne skojarzenia o sadzie i lesie — nie dopytuj wprost o to, czego sama unika.”

## Assety

- Tło: `/levels/level_01/girl_magic_forest.png`
- Muzyka: `/audio/music/levels/01-mila/girl-magic-forest.wav`
- Portret: `/characters/girl.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Start | Komplement | Skojarzenie / opowieść |
|-----------|-------|------------|------------------------|
| `socialOpenness` | 38 | +12 | +6 |
| `secretPressure` | 5 | +0 | +14 |
| `topicAvoidance` | 88 | ≈0 | -8 |

**Rada wewnętrzna:** Strach, Ciekawość, Tęsknota, Strażnik Słowa. Wygrana wymaga `secretPressure ≥ 35` + odpowiedni `responseMode`, nie samego zaufania.

## Warstwa fabularna

Mila strzeże Pierwszego Milczenia: Pamięci. Zapamiętała sad, czerwony owoc i początek Pęknięcia,
ale nie rozumie ich znaczenia. Jej fragment prowadzi do Handlarza i srebrnej zapłaty.
