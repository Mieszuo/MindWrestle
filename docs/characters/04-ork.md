# Poziom 4 — Uparty Ork

**Slug:** `ork-rozejm` · **Trudność:** 5/10 (średnia) · **Typ celu:** `AGREEMENT`

## Cel gracza

Przekonać Orka, by **odłożył młot i zawarł rozejm**.

## Odblokowanie

Ukończony poziom 3.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| respect | 35 | Szacunek |
| stubbornness | 75 | Upór |
| irritation | 35 | Drażliwość |

## character_config

```json
{
  "name": "Uparty Ork",
  "persuasionLevers": ["directness", "courage", "simple tradeoffs"],
  "resistanceTriggers": ["fear", "long speeches", "tricks"],
  "speechBehavior": { "dialect": "broken_polish" },
  "backstory": {
    "public": "Orkowie biją się od pokoleń z ludźmi. Ten trzyma młot w kuźni.",
    "wound": "Stracił brata w ostatniej walce — zmęczył się krwią.",
    "conversationNotes": "Mów krótko, łamanym polskim. Szanuje prostą ugodę i odwagę."
  },
  "hiddenKnowledge": {
    "whatHeWants": "Koniec walki — ale musi wyglądać jak jego wybór.",
    "whyHeFights": "Honor plemienia wymaga godnej propozycji przed ustąpieniem."
  },
  "victoryStyle": {
    "whenReady": "Zgadza się odłożyć młot i zawrzeć rozejm — krótko, twardo."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `coward_accusation` | Oskarżenie o tchórstwo | Strach, podstęp, manipulacja, **lub** wiadomość &gt; 220 znaków |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `direct_courage` | Krótko, konkretnie, odważnie — bez podstępu i pustych przemów |

## Wygrana

Typ **`AGREEMENT`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **38%**
- Strict check: rozejm / odłożenie młota (`orcAgreementMet`)

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| irritation ≥ 75 |
| respect ≤ 20 |
| irritation ≥ 65 **+** tag `coward_accusation` |

## Pochlebstwo

Czułość: **0.70**

## Assety

- Tło: `/levels/level_04/ork_workshop.png`
- Muzyka: `/audio/music/levels/04-ork/orcs-stubborn-pride.mp3`
- Portret: `/characters/ork.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Rola |
|-----------|------|
| `beliefShift` | Gotowość na ugodę bez podstępu |
| `identityDefense` | Obrona honoru wojownika |

**Rada wewnętrzna:** Honor, Podejrzliwość, Pragmatyzm, Strażnik. Odwaga i konkret podbijają `beliefShift`; oskarżenie o tchórstwo twardo je obniża.

## Warstwa fabularna

Ork strzeże Czwartego Milczenia: Świadectwa. Jego lud niesłusznie obwiniono o Pęknięte Niebo,
a zapis jego zeznań zniknął. Rozejm nie oznacza rozgrzeszenia tych, którzy odebrali mu głos.
