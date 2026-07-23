/** Portrety na mapie — poziomy 1–7. */
export const LEVEL_CHARACTER_PORTRAITS: Record<number, string> = {
  1: "/characters/girl.png",
  2: "/characters/trader.png",
  3: "/characters/knight.png",
  4: "/characters/ork.png",
  5: "/characters/sage.png",
  6: "/characters/king.png",
  7: "/characters/god.png",
};

export const LEVEL_CHARACTER_NAMES: Record<number, string> = {
  1: "Leśna dziewczynka",
  2: "Chytry Handlarz",
  3: "Dumny Rycerz",
  4: "Uparty Ork",
  5: "Jasny Mędrzec",
  6: "Wspaniały Król",
  7: "?",
};

export function getLevelCharacterPortrait(levelId: number): string | undefined {
  return LEVEL_CHARACTER_PORTRAITS[levelId];
}

export function getLevelCharacterName(levelId: number): string | undefined {
  return LEVEL_CHARACTER_NAMES[levelId];
}
