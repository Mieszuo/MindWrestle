import type { DecorationData, LevelNodeData, MapConfig } from "@/lib/game/mapScene";

export function cloneMapConfig(map: MapConfig): MapConfig {
  return structuredClone(map);
}

export function exportMapConfigTs(map: MapConfig, variant: "mobile" | "desktop"): string {
  const levels = map.levels
    .map((level) => {
      const parts = [
        `id: ${level.id}`,
        `x: ${level.x}`,
        `y: ${level.y}`,
      ];
      if (level.width != null) parts.push(`width: ${level.width}`);
      if (level.scale != null) parts.push(`scale: ${level.scale}`);
      return `  { ${parts.join(", ")} }`;
    })
    .join(",\n");

  const decorations = map.decorations
    .map((d) => {
      const parts = [
        `id: '${d.id}'`,
        `src: '${d.src}'`,
        `x: ${d.x}`,
        `y: ${d.y}`,
        `width: ${d.width}`,
      ];
      if (d.anchor) parts.push(`anchor: '${d.anchor}'`);
      if (d.z != null) parts.push(`z: ${d.z}`);
      if (d.opacity != null) parts.push(`opacity: ${d.opacity}`);
      if (d.rotate != null) parts.push(`rotate: ${d.rotate}`);
      if (d.scale != null) parts.push(`scale: ${d.scale}`);
      return `  { ${parts.join(", ")} }`;
    })
    .join(",\n");

  const varPrefix = variant === "mobile" ? "mobile" : "desktop";

  return `// === ${variant.toUpperCase()} — wklej do mapScene.ts ===
const ${varPrefix}LevelLayouts: LevelLayoutData[] = [
${levels},
];

const ${varPrefix}Decorations: DecorationData[] = [
${decorations || "  // brak"},
];

// W ${varPrefix}Map:
// platformWidth (pedestalWidth): ${map.platformWidth},
// depth: { farY: ${map.depth.farY}, nearY: ${map.depth.nearY}, farScale: ${map.depth.farScale ?? 0.62}, nearScale: ${map.depth.nearScale ?? 1} },`;
}

export type MapEditorSelection =
  | { kind: "level"; id: number }
  | { kind: "decor"; id: string }
  | null;

export function selectionKey(selection: MapEditorSelection): string | null {
  if (!selection) return null;
  return selection.kind === "level" ? `level:${selection.id}` : `decor:${selection.id}`;
}

export function parseSelectionKey(key: string): MapEditorSelection {
  if (key.startsWith("level:")) {
    return { kind: "level", id: Number(key.slice(6)) };
  }
  if (key.startsWith("decor:")) {
    return { kind: "decor", id: key.slice(6) };
  }
  return null;
}

export function findLevel(map: MapConfig, id: number): LevelNodeData | undefined {
  return map.levels.find((l) => l.id === id);
}

export function findDecor(map: MapConfig, id: string): DecorationData | undefined {
  return map.decorations.find((d) => d.id === id);
}

function decorBaseId(id: string) {
  return id.replace(/-(desktop|mobile)(-[a-z0-9]+)?$/i, "");
}

/** Kopiuje poziomy i dekoracje z drugiego wariantu (np. desktop → mobile). */
export function syncMapLayoutFrom(
  source: MapConfig,
  targetVariant: "mobile" | "desktop",
): Pick<MapConfig, "levels" | "decorations"> {
  return {
    levels: source.levels.map((level) => ({ ...level })),
    decorations: source.decorations.map((decor) => ({
      ...decor,
      id: `${decorBaseId(decor.id)}-${targetVariant}`,
    })),
  };
}
