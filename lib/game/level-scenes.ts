import type { MusicTrack } from "@/lib/audio/audio-types";

/** Pełnoekranowe tła rozmowy (poziom → asset). */
export const LEVEL_SCENE_IMAGES: Record<number, string> = {
  1: "/levels/level_01/girl_magic_forest.png",
  2: "/levels/level_02/trader_shop.png",
  3: "/levels/level_03/knight_castle.png",
  4: "/levels/level_04/ork_workshop.png",
  5: "/levels/level_05/sage_magic.png",
  6: "/levels/level_06/king_castle.png",
  7: "/levels/level_07/god_fractures.png",
};

export const LEVEL_SCENE_MUSIC: Record<number, MusicTrack> = {
  1: "level1",
  2: "level2",
  3: "level3",
  4: "level4",
  5: "level5",
  6: "level6",
  7: "level7",
};

export function getLevelSceneImage(levelId: number): string | undefined {
  return LEVEL_SCENE_IMAGES[levelId];
}

export function getLevelSceneMusicTrack(levelId: number): MusicTrack {
  return LEVEL_SCENE_MUSIC[levelId] ?? "conversation";
}
