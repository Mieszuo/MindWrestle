import { getLevelLore } from "@/lib/game/lore/chronicle-entries";
import type { Locale } from "@/lib/i18n/locale";
import type { Json } from "@/lib/supabase/database.types";

export interface ChronicleEntry {
  id: string;
  levelId: number;
  levelSlug: string;
  title: string;
  narrativeText: string;
  clueText: string;
  completionReveal: string;
  imagePath: string;
  unlockedAt: string;
  relatedCharacterIds: number[];
}

export interface PlayerLoreState {
  discoveredFragments: string[];
  completedLoreBeats: Record<string, boolean>;
  chronicleEntries: ChronicleEntry[];
  finalTruthProgress: number;
  endingSeen: boolean;
}

export interface UnlockLoreResult {
  state: PlayerLoreState;
  entry: ChronicleEntry | null;
  isFirstDiscovery: boolean;
}

export function defaultPlayerLoreState(): PlayerLoreState {
  return {
    discoveredFragments: [],
    completedLoreBeats: {},
    chronicleEntries: [],
    finalTruthProgress: 0,
    endingSeen: false,
  };
}

export function parsePlayerLoreState(value: unknown): PlayerLoreState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultPlayerLoreState();
  const source = value as Record<string, unknown>;
  const discoveredFragments = Array.isArray(source.discoveredFragments)
    ? source.discoveredFragments.filter((entry): entry is string => typeof entry === "string")
    : [];
  const chronicleEntries = Array.isArray(source.chronicleEntries)
    ? source.chronicleEntries.filter(isChronicleEntry)
    : [];
  const completedLoreBeats =
    source.completedLoreBeats &&
    typeof source.completedLoreBeats === "object" &&
    !Array.isArray(source.completedLoreBeats)
      ? Object.fromEntries(
          Object.entries(source.completedLoreBeats as Record<string, unknown>).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
          ),
        )
      : {};

  const uniqueDiscoveredFragments = [...new Set(discoveredFragments)];

  return {
    discoveredFragments: uniqueDiscoveredFragments,
    completedLoreBeats,
    chronicleEntries,
    finalTruthProgress: Math.min(7, Math.max(uniqueDiscoveredFragments.length, chronicleEntries.length)),
    endingSeen: source.endingSeen === true,
  };
}

function isChronicleEntry(value: unknown): value is ChronicleEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.levelId === "number" &&
    typeof entry.title === "string" &&
    typeof entry.narrativeText === "string" &&
    typeof entry.unlockedAt === "string"
  );
}

export function unlockLoreFragment(
  current: PlayerLoreState,
  levelId: number,
  unlockedAt = new Date().toISOString(),
  locale?: Locale,
): UnlockLoreResult {
  const lore = getLevelLore(levelId, locale);
  if (!lore) return { state: current, entry: null, isFirstDiscovery: false };

  const existing = current.chronicleEntries.find((entry) => entry.id === lore.fragmentId) ?? null;
  if (current.discoveredFragments.includes(lore.fragmentId) || existing) {
    return { state: current, entry: existing, isFirstDiscovery: false };
  }

  const entry: ChronicleEntry = {
    id: lore.fragmentId,
    levelId: lore.levelId,
    levelSlug: lore.levelSlug,
    title: lore.chronicleTitle,
    narrativeText: lore.chronicleEntry,
    clueText: lore.nextLevelClue,
    completionReveal: lore.completionReveal,
    imagePath: lore.postLevelImage,
    unlockedAt,
    relatedCharacterIds: [lore.levelId],
  };
  const discoveredFragments = [...current.discoveredFragments, lore.fragmentId];
  return {
    state: {
      ...current,
      discoveredFragments,
      chronicleEntries: [...current.chronicleEntries, entry],
      finalTruthProgress: discoveredFragments.length,
    },
    entry,
    isFirstDiscovery: true,
  };
}

export function playerLoreStateToJson(state: PlayerLoreState): Json {
  return state as unknown as Json;
}

export function markEndingSeen(current: PlayerLoreState): PlayerLoreState {
  return { ...current, endingSeen: true };
}
