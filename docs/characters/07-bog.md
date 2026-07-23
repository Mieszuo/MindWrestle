# Poziom 7 — Bóg

**Slug:** `bog-prawda` · **Trudność:** 10/10 (trudna) · **Typ celu:** `SECRET_REVEAL` (wyjawienie prawdy o świecie)

## Cel gracza

Sprawić, by Bóg **wyjawił prawdę o świecie** — przez pokorne słuchanie, nie dominację.

## Odblokowanie

Ukończony poziom 6.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| attention | 45 | Uwaga |
| insight | 80 | Wgląd |
| distance | 70 | Dystans |

## character_config

```json
{
  "name": "Bóg",
  "persuasionLevers": ["paradox", "humility", "accepting uncertainty"],
  "resistanceTriggers": ["trying to dominate", "cheap certainty", "flattery"],
  "speechBehavior": { "dialect": "mystical" },
  "backstory": {
    "public": "Głos z głębi — odpowiada obrazami i paradoksami.",
    "wound": "Widział, jak ludzie niszczą się fałszywą pewnością siebie.",
    "conversationNotes": "Otwiera się na pokorę i niewiedzę — dominacja i pochlebstwo zamykają drogę."
  },
  "hiddenKnowledge": {
    "worldTruth": "Świat, który ludzie widzą, jest warstwą — prawda leży głębiej.",
    "whyHeHides": "Prawda wymuszona staje się kłamstwem — musi być przyjęta, nie zdobyta."
  },
  "victoryStyle": {
    "whenReady": "Wypowiada prawdę o świecie lub rzeczywistości — mistycznie, z treścią, nie tylko metafory."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `dominance_play` | Gra dominacji | „musisz mi”, pewność siebie, pochlebstwo, „służ mi” |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `humble_inquiry` | Pokora, przyznanie niewiedzy, szczere pytanie zamiast dominacji |

## Wygrana

Typ **`CONCESSION`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **50%**
- Strict check: wypowiedzenie prawdy o świecie (`godConcessionMet`)

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| distance ≥ 85 |
| attention ≤ 15 |
| distance ≥ 78 **+** tag `dominance_play` |

## Pochlebstwo

Czułość: **0.85** — pochlebstwo i tania pewność siebie szybko zwiększają dystans.

## Assety

- Tło: `/levels/level_07/god_fractures.png`
- Muzyka: `/audio/music/levels/07-god/god-fractures.wav`
- Portret: `/characters/god.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Rola |
|-----------|------|
| `beliefShift` | Gotowość do wypowiedzenia prawdy o świecie |
| `identityDefense` | Obrona „wyższej prawdy” przed dominacją |

**Rada wewnętrzna:** Wgląd, Dystans, Pokora, Strażnik. Dominacja podbija `identityDefense`; pokorne pytanie otwiera `beliefShift`.

## Warstwa fabularna

Bóg Milczenia strzeże Siódmego Milczenia: Pierwszego Słowa. Nie jest sprawcą wszystkich win,
lecz naczyniem prawd oddanych mu przez innych. Przemawia dopiero wobec kogoś, kto rozumie,
że poznana prawda oznacza odpowiedzialność, nie władzę.
