# Map Style Lock — MindWrestle

Paste at the **start of every** image-generation prompt.

## STYLE LOCK

```
Cozy stylized 3D cartoon mobile game art, toy-like fantasy diorama style, soft clay/plastic render, rounded chunky shapes, pastel color palette, warm friendly atmosphere, polished casual mobile game quality, orthographic isometric 3/4 top-down camera, consistent camera angle, soft sunlight from upper left, soft shadows falling slightly down-right, soft ambient occlusion, visible contact shadows, beveled edges, clean readable silhouette, miniature world aesthetic, strong sense of depth, layered composition, charming magical adventure map style, family-friendly, whimsical, premium casual game look.
```

## Negative prompt

```
realistic photo, hyperrealism, flat vector, pixel art, anime lineart, harsh black outlines, dark horror, gritty realism, dirty texture, sharp noisy texture, messy details, inconsistent lighting, wrong perspective, front view, side view, different camera angle, hard black shadows, overexposed, blurry, low resolution, cropped object, text, letters, numbers, watermark, logo, UI labels, characters, people, animals, pedestal circles, platform pads, level spots, ellipses on path, stone circles under levels.
```

## Rules

- **Background raster** contains only: path, landscape, sky, and character **props** (`elements/` baked in or placed via editor). **Never** paint pedestal spots, circles, ellipses, or platform pads on the path.
- **React** owns every playable spot: pedestal PNG, contact shadow, glow, level number, checkmark, lock, badge, character portrait.
- Do **not** align pedestals to painted fields on the background — coordinates `(x, y)` are the **bottom-center contact point** on the path; the pedestal asset defines the visible platform.
- **Never** bake into raster assets: level numbers, stars, checkmarks, labels, lock icons, characters.
- After picking a background, use it as **Style Reference A** for all other assets.
- Export background at master size matching `MAP_SOURCE` (1672×941). Decor/pedestals: transparent PNG/WebP.

## QA checklist (per asset)

- [ ] No text, numbers, watermark
- [ ] Transparent background (except full map background)
- [ ] Same 3/4 top-down camera as reference
- [ ] Light upper-left, shadow down-right
- [ ] Readable silhouette at thumbnail size
- [ ] Consistent scale vs open pedestal

## File locations

| Asset | Path |
|-------|------|
| Background | `public/map/background.webp` |
| Pedestals | `public/map/pedestals/{open,current,done,locked}.webp` |
| Glow | `public/map/effects/glow.webp` |
| Decor | `public/map/decor/*.webp` |
| Foreground | `public/map/foreground/leaf-cluster.webp` |

After adding files, set flags in [`lib/game/map-assets.ts`](../lib/game/map-assets.ts).

## Generation order

1. Background only → pick Style Reference A  
2. Pedestals open/current/done/locked + glow  
3. Rock, grass, flower, bush, tree  
4. Foreground leaves  
5. **STOP** — visual checkpoint  
6. Bridge, stream, lantern, fence, sign, mushroom, chest, crystal, fog, sparkles (in batches)
