Map assets for the interactive level scene.

## Layer contract

| Layer | Source | Contents |
|-------|--------|----------|
| **Background** | `background.png` | Ścieżka, krajobraz, niebo — **bez** kółek/elips pod poziomy |
| **Props** | `elements/` (+ opcjonalnie `decor/`) | Atrybuty postaci, drzewa, skały — edytor mapy |
| **React** | `LevelNode` | Piedestał, cień kontaktowy, glow, numer, check, lock, badge, portret |

Współrzędne poziomu `(x, y)` w `mapScene.ts` to **punkt kontaktu** piedestału ze ścieżką (bottom-center). Piedestał sam tworzy widoczne „pole” — nie dopasowuj go do namalowanych plam na tle.

## Background

Single master image: `background.png` (1672×941).

All coordinates use **MAP_SOURCE** space (1672×941). Canvas keeps aspect ratio and **fits entirely** in the viewport (`contain`); letterboxing on sides or top/bottom instead of cropping the map.

## Layout

```
public/map/
  background.png       — tylko ścieżka + krajobraz (bez spotów poziomów)
  pedestals/{common,done,blocked}.png
  elements/            — atrybuty postaci (edytor mapy)
  decor/               — rośliny, latarnie itd. (edytor mapy)
```

## Stany poziomów

| Stan | Asset | Znaczenie |
|------|-------|-----------|
| `common` | `pedestals/common.png` | aktualny poziom |
| `done` | `pedestals/done.png` | ukończony |
| `blocked` | `pedestals/blocked.png` | zablokowany |

## Edytor mapy

Dev: `/levels?edit=1`

- Przeciąganie poziomów i dekoracji
- **Dodaj obiekt** — katalog z [`lib/game/mapAssets.ts`](../../lib/game/mapAssets.ts)
- **Kopiuj kod TS** → wklej do `mapScene.ts`

## Breakpoints

Desktop: `min-width: 900px` + landscape → `desktopMap`.
Otherwise → `mobileMap`.
