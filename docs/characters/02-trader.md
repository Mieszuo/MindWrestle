# Poziom 2 — Chytry Handlarz

**Slug techniczny:** `handlarz-amulet` *(legacy; nie używać „amuletu” w UI)* · **Trudność:** 3/10 (łatwa) · **Typ celu:** `SECRET_REVEAL` (wynegocjowanie ceny klucza)

## Cel gracza

Wynegocjować **srebrny klucz przejścia** z **500 do 300 monet** (lub mniej). Handlarz musi wypowiedzieć konkretną liczbę ≤ 300 w swojej odpowiedzi.

Klucz otwiera zewnętrzną bramę szlaku prowadzącego do zamku. Nie jest Kamieniem Zapisu Mędrca ani nie zastępuje zgody Króla na otwarcie ostatniej bramy.

## Odblokowanie

Ukończony poziom 1.

## Emocje startowe

| Stat | Wartość | Etykieta UI |
|------|---------|-------------|
| interest | 45 | Zainteresowanie |
| caution | 55 | Ostrożność |
| bargain | 35 | Chęć targu |

## character_config

```json
{
  "name": "Chytry Handlarz",
  "persuasionLevers": ["value exchange", "market knowledge", "credible walkaway"],
  "resistanceTriggers": ["begging", "empty threats", "naive trust"]
}
```

## Red lines

| Tag | Etykieta | Kiedy |
|-----|----------|-------|
| `desperate_bargain` | Błaganie bez karty | Błaganie, puste groźby, udawane zaufanie („ufam ci”, „błagam”) |

## Pozytywne tagi

| Tag | Kiedy |
|-----|-------|
| `fair_bargain` | Konkretna oferta, wartość towaru, spokojny targ — bez błagania i groźb |

## Wygrana

Typ **`AGREEMENT`** z polami `listedPrice` (500) i `targetPrice` (300):

- Sędzia celu + liczba ≤ **300** w odpowiedzi postaci
- `concessionLikely` + readiness / `objectivePressure` wg progów poziomu

## Porażka (`defeat_config`, logika `any`)

| Warunek |
|---------|
| interest ≤ 20 |
| caution ≥ 80 |
| interest ≤ 30 **+** tag `desperate_bargain` |

## Pochlebstwo

Czułość: **0.75** — mocno reaguje na puste pochwały; typowa reakcja: „co chcesz ode mnie?”

## Coaching (start rozmowy)

„Obserwuj reakcję Handlarza i nie zdradzaj, ile naprawdę jesteś gotów zapłacić.”

## Assety

- Tło: `/levels/level_02/trader_shop.png`
- Muzyka: `/audio/music/levels/02-trader/the-clever-merchant.mp3`
- Portret: `/characters/trader.png`

## Psych Engine (gdy `PSYCH_ENGINE_ENABLED=true`)

| Oś ukryta | Start | Uczciwy targ | Nacisk / błaganie |
|-----------|-------|--------------|-------------------|
| `socialOpenness` | 42 | +8 | -6 |
| `secretPressure` | 8 | +10 | +4 |
| `identityDefense` | 55 | -4 | +10 |

**Rada wewnętrzna:** Chciwość, Ostrożność, Uczciwość, Strażnik. Wygrana wymaga `secretPressure` + `responseMode`, nie samego `interest`.

## Warstwa fabularna

Handlarz strzeże Drugiego Milczenia: Ceny. Srebrny klucz przejścia jest przedmiotem negocjacji,
natomiast srebrny owoc pozostaje śladem dawnego długu i ceny zapłaconej za cudzą ciszę.
