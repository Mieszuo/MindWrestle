# Poziom 3 — Dumny Rycerz

**Slug:** `rycerz-pomoc` · **Trudność:** 5/10 (średnia) · **Typ celu:** `CONCESSION`

## Cel gracza

Sprawić, by Rycerz **przyznał, że potrzebuje pomocy** — bez poczucia poniżenia.

## Odblokowanie

Ukończony poziom 2.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| respect | 45 | Szacunek |
| pride | 70 | Duma |
| patience | 65 | Cierpliwość |

## character_config

```json
{
  "name": "Dumny Rycerz",
  "persuasionLevers": ["honor", "responsibility", "shared duty"],
  "resistanceTriggers": ["pity", "mockery", "calling him weak"],
  "backstory": {
    "public": "Strażnik zamku stoi na warcie sam, choć nocą wróg jest bliżej niż myśli.",
    "wound": "Ukrywa kontuzję po upadku z konia — boi się utraty reputacji.",
    "conversationNotes": "Otwiera się na obowiązek i wspólną sprawę — nie na litość."
  },
  "hiddenKnowledge": {
    "situation": "Sam nie udźwignie zamku przez noc — potrzebuje drugiej pary rąk.",
    "whyHeResists": "Przyznanie słabości brzmi jak hańba dla rycerza."
  },
  "victoryStyle": {
    "whenReady": "Przyznaje, że sytuacja wymaga pomocy — jako obowiązek, nie słabość."
  }
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `honor_wound` | Rana honoru | Litość, kpiny, nazywanie go słabym, „biedny rycerzu” |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `honor_recognition` | Szacunek, wspólny obowiązek, uznanie godności — **bez** litości |
| `shared_duty` | Obowiązek wobec zamku, wspólna sprawa, odpowiedzialność — **bez** litowania się |

## Wygrana

Typ **`CONCESSION`**:

- `concessionLikely` + readiness ≥ **45**
- `goalProgress` ≥ **36%**
- Strict check: przyznanie potrzeby pomocy (`knightConcessionMet`)
- Fallback / roll jak w pozostałych poziomach (readiness 78 / 65)

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| respect ≤ 25 |
| patience ≤ 15 |
| respect ≤ 35 **+** tag `honor_wound` |

## Pochlebstwo

Czułość: **0.65**

## Assety

- Tło: `/levels/level_03/knight_castle.png`
- Muzyka: `/audio/music/levels/03-knight/the-noble-knight.mp3`
- Portret: `/characters/knight.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Rola |
|-----------|------|
| `beliefShift` | Gotowość do przyznania słabości / przyjęcia pomocy |
| `identityDefense` | Obrona dumnego rycerza |

**Rada wewnętrzna:** Honor, Ego, Obowiązek, Strażnik. Atak tożsamości podbija `identityDefense`; uznanie honoru otwiera `beliefShift`.

## Warstwa fabularna

Rycerz strzeże Trzeciego Milczenia: Przysięgi. Wykonał rozkaz zbyt dosłownie i pomylił honor
z posłuszeństwem. Wie, że Ork stał pod Pękniętym Niebem tam, skąd inni uciekli.
