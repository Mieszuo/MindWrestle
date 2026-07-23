# MindWrestle — dokumentacja

## Silnik gry

- [Przegląd silnika](./engine/README.md) — warstwy, pojęcia, przepływ tury
- [Margines Kroniki](./engine/coaching-system.md) — żywy system hintów i coachingu
- [Głos (STT / TTS)](./engine/voice.md) — plan i implementacja mowy gracza i postaci

## Postacie i poziomy

- [Indeks postaci (1–7)](./characters/README.md) — cele, emocje, red lines, wygrana/porażka, assety

## Mapa i styl wizualny

- [Map style lock](./map/map-style-lock.md) — prompt do generowania grafik mapy

## Fabuła — Siedem Milczeń

- [Indeks fabuły](./lore/README.md) — kanon, Kronika, plan wdrożenia Lore Engine
- [Matryca Kroniki (poziomy 1–7)](./lore/04-chronicle-matrix.md)
- [Dane Kroniki (JSON)](./lore/data/chronicle-entries.json) — źródło copy do kodu
- [Luki i decyzje do podjęcia](./lore/09-gaps-and-decisions.md)

## Źródła prawdy w kodzie

| Temat | Plik |
|-------|------|
| Seed poziomów (DB) | `supabase/migrations/20250618000000_game_engine_foundation.sql` |
| Progi wygranej | `lib/game/victory-thresholds.ts` + `20250618100000_easier_victory_thresholds.sql` |
| Progi porażki | `lib/game/defeat-thresholds.ts` + `20250618090000_stricter_defeat_thresholds.sql` |
| Red lines | `lib/game/resistance-triggers.ts` |
| Pozytywne tagi | `lib/game/reputation-triggers.ts` |
| Readiness / pochlebstwo | `lib/game/utterance-readiness.ts` |
| Tła i muzyka | `lib/game/level-scenes.ts`, `lib/audio/audio-assets.ts` |
| Głos STT/TTS | `docs/engine/voice.md`, `lib/game/voice-profiles.ts`, `lib/game/voice-delivery.ts` |
