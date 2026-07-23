import { emptyPlayerProgress, getMapLevelState, type PlayerProgress } from "@/lib/game/progress";

export type LevelState = "blocked" | "current" | "done";

/** Pozycja poziomu na mapie — bez stanu postępu (pochodzi z progress.ts). */
export type LevelLayoutData = {
  id: number;
  /** MAP_SOURCE x — środek piedestału (kontakt ze ścieżką na dole). */
  x: number;
  /** MAP_SOURCE y — dolna krawędź piedestału / punkt na ścieżce. */
  y: number;
  scale?: number;
  width?: number;
};

export type LevelNodeData = LevelLayoutData & {
  state: LevelState;
};

/** Master background — all x/y are in this coordinate space. */
export const MAP_SOURCE = {
  width: 1672,
  height: 941,
  background: "/map/background.png",
} as const;

export type DecorationData = {
  id: string;
  src: string;
  x: number;
  y: number;
  /** Base width at full depth (near); scaled by y via getSpriteWidth. */
  width: number;
  z?: number;
  opacity?: number;
  rotate?: number;
  /** Extra multiplier on top of depth width (e.g. boss highlight). */
  scale?: number;
  anchor?: "center" | "bottom-center";
};

export type DepthConfig = {
  farY: number;
  nearY: number;
  farScale?: number;
  nearScale?: number;
};

/** Layout variant — same background, may differ in level/decor placement. */
export type MapConfig = {
  id: "mobile" | "desktop";
  platformWidth: number;
  depth: DepthConfig;
  levels: LevelNodeData[];
  decorations: DecorationData[];
};

/** Piedestały — osobne PNG; tło nie zawiera plam pod poziomy. */
export const pedestalAssets: Record<LevelState, string> = {
  current: "/map/pedestals/common.png",
  done: "/map/pedestals/done.png",
  blocked: "/map/pedestals/blocked.png",
};

/** @deprecated Use pedestalAssets */
export const platformAssets = pedestalAssets;

export function mapPosition(x: number, y: number) {
  return {
    left: `${(x / MAP_SOURCE.width) * 100}%`,
    top: `${(y / MAP_SOURCE.height) * 100}%`,
  };
}

export function mapSize(size: number) {
  return `${(size / MAP_SOURCE.width) * 100}%`;
}

export function mapDepth(y: number, z = 0) {
  return Math.round(y) + z;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function getDepthScale(params: {
  y: number;
  farY: number;
  nearY: number;
  farScale?: number;
  nearScale?: number;
}) {
  const {
    y,
    farY,
    nearY,
    farScale = 0.62,
    nearScale = 1,
  } = params;

  const raw = (y - farY) / (nearY - farY);
  const depth = smoothstep(clamp(raw, 0, 1));

  return farScale + (nearScale - farScale) * depth;
}

export function getPlatformWidth(map: MapConfig, y: number) {
  const scale = getDepthScale({
    y,
    farY: map.depth.farY,
    nearY: map.depth.nearY,
    farScale: map.depth.farScale,
    nearScale: map.depth.nearScale,
  });

  return map.platformWidth * scale;
}

export function getSpriteWidth(map: MapConfig, baseWidth: number, y: number) {
  const scale = getDepthScale({
    y,
    farY: map.depth.farY,
    nearY: map.depth.nearY,
    farScale: map.depth.farScale,
    nearScale: map.depth.nearScale,
  });

  return baseWidth * scale;
}

export function getCurrentAct(map: MapConfig): number {
  const current = map.levels.find((level) => level.state === "current");
  if (current) {
    if (current.id <= 2) return 1;
    if (current.id <= 4) return 2;
    if (current.id <= 6) return 3;
    return 4;
  }
  const doneCount = map.levels.filter((level) => level.state === "done").length;
  if (doneCount >= 5) return 4;
  if (doneCount >= 3) return 3;
  if (doneCount >= 2) return 2;
  return 1;
}

const romanActs = ["I", "II", "III", "IV", "V"] as const;

export function formatActBadge(map: MapConfig) {
  const act = getCurrentAct(map);
  return `AKT ${romanActs[act - 1] ?? "I"}`;
}

function layoutsToLevels(
  layouts: LevelLayoutData[],
  progress: PlayerProgress = emptyPlayerProgress(),
): LevelNodeData[] {
  return layouts.map((layout) => ({
    ...layout,
    state: getMapLevelState(layout.id, progress),
  }));
}

// === MOBILE LEVELS ===
const mobileLevelLayouts: LevelLayoutData[] = [
  { id: 1, x: 943, y: 842 },
  { id: 2, x: 766, y: 705 },
  { id: 3, x: 925, y: 578 },
  { id: 4, x: 713, y: 472 },
  { id: 5, x: 910, y: 373 },
  { id: 6, x: 791, y: 249 },
  { id: 7, x: 860, y: 132 },
];

const mobileDecorations: DecorationData[] = [];

// === DESKTOP LEVELS ===
const desktopLevelLayouts: LevelLayoutData[] = [
  { id: 1, x: 940, y: 824 },
  { id: 2, x: 764, y: 696 },
  { id: 3, x: 925, y: 572 },
  { id: 4, x: 704, y: 464 },
  { id: 5, x: 905, y: 367 },
  { id: 6, x: 796, y: 246 },
  { id: 7, x: 862, y: 135 },
];

const desktopDecorations: DecorationData[] = [];

export const mobileMap: MapConfig = {
  id: "mobile",
  platformWidth: 183,
  depth: {
    farY: 105,
    nearY: 850,
    farScale: 0.72,
    nearScale: 1,
  },
  levels: layoutsToLevels(mobileLevelLayouts),
  decorations: mobileDecorations,
};

export const desktopMap: MapConfig = {
  id: "desktop",
  platformWidth: 183,
  depth: {
    farY: 105,
    nearY: 810,
    farScale: 0.72,
    nearScale: 1,
  },
  levels: layoutsToLevels(desktopLevelLayouts),
  decorations: desktopDecorations,
};
