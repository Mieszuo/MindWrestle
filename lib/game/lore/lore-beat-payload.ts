import { getLevelLore } from "@/lib/game/lore/chronicle-entries";
import type { ChronicleEntry } from "@/lib/game/lore/player-lore-state";
import type { Locale } from "@/lib/i18n/locale";

export interface LoreBeatPayload {
  fragmentId: string;
  levelId: number;
  title: string;
  completionReveal: string;
  characterTruth: string;
  chronicleEntry: string;
  nextLevelClue: string;
  imagePath: string;
  isFirstDiscovery: boolean;
}

export function buildLoreBeatPayload(
  levelId: number,
  entry: ChronicleEntry | null,
  isFirstDiscovery: boolean,
  locale?: Locale,
): LoreBeatPayload | null {
  const lore = getLevelLore(levelId, locale);
  if (!lore || !entry) return null;
  return {
    fragmentId: lore.fragmentId,
    levelId,
    title: lore.chronicleTitle,
    completionReveal: lore.completionReveal,
    characterTruth: lore.characterTruthShort,
    chronicleEntry: lore.chronicleEntry,
    nextLevelClue: lore.nextLevelClue,
    imagePath: lore.postLevelImage,
    isFirstDiscovery,
  };
}
