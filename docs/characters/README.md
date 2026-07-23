# Postacie — indeks

Każdy poziom ma profil w `game_levels.character_config` (Supabase). Prompty AI wstrzykują ten JSON w judge i character (`lib/ai/prompts.ts`).

| # | Postać | Slug | Typ celu | Trudność | Dokument |
|---|--------|------|----------|----------|----------|
| 1 | [Dziecko Mila](./01-mila.md) | `dziecko-jablko` | `CONCESSION` | 2/10 | Przyznanie strachu przed sadzie |
| 2 | [Chytry Handlarz](./02-trader.md) | `handlarz-amulet` *(legacy)* | `AGREEMENT` | 3/10 | Srebrny klucz przejścia, negocjacja 500→300 monet |
| 3 | [Dumny Rycerz](./03-knight.md) | `rycerz-pomoc` | `CONCESSION` | 5/10 | Przyznanie, że potrzebuje pomocy |
| 4 | [Uparty Ork](./04-ork.md) | `ork-rozejm` | `AGREEMENT` | 5/10 | Zgoda na rozejm |
| 5 | [Jasny Mędrzec](./05-sage.md) | `medrzec-klucz` *(legacy)* | `SECRET_REVEAL` | 6/10 | Lokalizacja Kamienia Zapisu |
| 6 | [Wspaniały Król](./06-king.md) | `krol-brama` | `AGREEMENT` | 8/10 | Otwarcie bramy |
| 7 | [Bóg](./07-bog.md) | `bog-prawda` | `CONCESSION` | 10/10 | Mistyczne ustępstwo — prawda o świecie |

Wspólne mechaniki opisane w [engine/README.md](../engine/README.md).

Przy włączonym Psych Engine (`PSYCH_ENGINE_ENABLED=true`) każda postać ma ukryte osie (`secretPressure` lub `beliefShift`) i wewnętrzną radę — profile w `lib/game/psychology/level-profiles.ts`. Szczegóły dla Mili i Króla: [01-mila.md](./01-mila.md), [06-king.md](./06-king.md).

**Odblokowanie:** poziom *N* wymaga ukończenia poziomu *N − 1* (`unlock_config.requiresCompletedLevelId`).

**Fabuła:** oś *Siedem Milczeń* — [dokumentacja lore](../lore/README.md). Cele mechaniczne poniżej; copy fabularne i Kronika w [matrycy](../lore/04-chronicle-matrix.md).
