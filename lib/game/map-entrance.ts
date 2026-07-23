import type { MapConfig } from "@/lib/game/mapScene";

/** Opóźnienie wg y — wyżej na mapie (mgła) pojawia się wcześniej. */
export function mapRevealDelay(y: number, depth: MapConfig["depth"]) {
  const range = depth.nearY - depth.farY;
  if (range <= 0) return 0.35;

  const t = Math.min(1, Math.max(0, (y - depth.farY) / range));
  return 0.22 + t * 0.58;
}

export const MAP_FOG_EASE = [0.22, 1, 0.36, 1] as const;

export const mapFogReveal = {
  hidden: { opacity: 0, filter: "blur(14px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
};

export const mapBackgroundReveal = {
  hidden: { opacity: 0, filter: "blur(18px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
};

export const mapSpriteFogReveal = {
  hidden: { opacity: 0, filter: "blur(12px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
};
