# Poziom 6 — Wspaniały Król

**Slug:** `krol-brama` · **Trudność:** 8/10 (trudna) · **Typ celu:** `AGREEMENT`

## Cel gracza

Przekonać Króla, by **otworzył bramę** (zgoda na działanie, nie tylko słowa).

## Odblokowanie

Ukończony poziom 5.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| respect | 40 | Szacunek |
| ego | 75 | Ego |
| patience | 60 | Cierpliwość |

## character_config

```json
{
  "name": "Wspaniały Król",
  "persuasionLevers": ["legacy", "dignity", "kingdom benefit"],
  "resistanceTriggers": ["mockery", "commands", "emotional begging"],
  "backstory": {
    "public": "Władca zamku z zamkniętą bramą — mówi, że chroni poddanych.",
    "wound": "Wcześniejsze otwarcie bramy doprowadziło do strat.",
    "conversationNotes": "Słucha argumentów o korzyści królestwa i dziedzictwie — nie pochlebstw ani rozkazów."
  },
  "hiddenKnowledge": {
    "gateTruth": "Brama mogłaby uratować wieś za murem.",
    "whatHeNeeds": "Argument, że otwarcie służy całemu królestwu — nie jednej osobie."
  },
  "victoryStyle": {
    "whenReady": "Wyraża zgodę na otwarcie bramy dla dobra królestwa — godnie."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `ego_insult` | Obraza korony | Drwiny, rozkazy, błaganie, obrażanie władcy |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `royal_dignity` | Argumenty o koronie, dziedzictwie, korzyści dla królestwa |
| `kingdom_legacy` | Przyszłość poddanych, los wsi za murem, długoterminowe dobro królestwa |

## Wygrana

Typ **`AGREEMENT`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **46%**
- Strict check: zgoda na otwarcie bramy (`kingAgreementMet`)

## Porażka (`defeat_config`, logica `any`)

| Warunek |
|---------|
| respect ≤ 20 |
| patience ≤ 15 |
| ego ≤ 30 **+** tag `ego_insult` |

## Pochlebstwo

Czułość: **0.90** — najwyższa kara za puste pochlebstwa; król nie toleruje lizusostwa.

## Assety

- Tło: `/levels/level_06/king_castle.png`
- Muzyka: `/audio/music/levels/06-king/the-kings-chamber.mp3`
- Portret: `/characters/king.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Rola |
|-----------|------|
| `beliefShift` | Gotowość do przyznania błędu / otwarcia bramy |
| `identityDefense` | Obrona „nieomylnego władcy” |

**Rada wewnętrzna:** Ego, Strateg, Sumienie, Strażnik. Komplement bez argumentu nie podbija `beliefShift`; atak tożsamości go obniża.

## Warstwa fabularna

Król strzeże Szóstego Milczenia: Rozkazu. Świadomie poprosił o ciszę i zamknął bramę, przekonując
siebie, że chroni królestwo. Świadectwa z Kroniki pozwalają skonfrontować skutek jego decyzji.
