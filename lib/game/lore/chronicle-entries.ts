import chronicleData from "@/docs/lore/data/chronicle-entries.json";
import type { Locale } from "@/lib/i18n/locale";

export interface LevelLoreConfig {
  fragmentId: string;
  levelId: number;
  levelSlug: string;
  characterName: string;
  arcRole: string;
  guardedSilence: string;
  hiddenTruth: string;
  chronicleTitle: string;
  completionReveal: string;
  characterTruthShort: string;
  chronicleEntry: string;
  nextLevelClue: string;
  postLevelImage: string;
  postLevelImagePrompt: string;
  promptBullets: string[];
  loreTagsRewarded: string[];
  feedsIntoLevels: number[];
  suggestedPlayerGoal?: string;
  mechanicalNote?: string;
  i18n?: Record<string, Partial<LevelLoreConfig>>;
}

const entries = chronicleData.entries as LevelLoreConfig[];

// Player-visible narrative fields have per-locale overrides in the JSON's
// `i18n` map (base columns are the Polish source). Overlaying them keeps the
// English build free of Polish lore text.
function localizeLoreEntry(entry: LevelLoreConfig, locale?: Locale): LevelLoreConfig {
  const overlay = locale ? entry.i18n?.[locale] : undefined;
  return overlay ? { ...entry, ...overlay } : entry;
}

export function getLevelLore(levelId: number, locale?: Locale): LevelLoreConfig | null {
  const entry = entries.find((entry) => entry.levelId === levelId) ?? null;
  return entry ? localizeLoreEntry(entry, locale) : null;
}

export function getLoreFragment(fragmentId: string, locale?: Locale): LevelLoreConfig | null {
  const entry = entries.find((entry) => entry.fragmentId === fragmentId) ?? null;
  return entry ? localizeLoreEntry(entry, locale) : null;
}

export function getAllLevelLore(locale?: Locale): LevelLoreConfig[] {
  return entries.map((entry) => localizeLoreEntry(entry, locale));
}

export function buildKnownLoreBullets(discoveredFragments: string[], targetLevelId: number): string[] {
  const knownEntries = entries.filter(
    (entry) =>
      discoveredFragments.includes(entry.fragmentId) &&
      entry.levelId < targetLevelId,
  );
  if (!knownEntries.length) return [];

  if (targetLevelId === 7) {
    return knownEntries.map(
      (entry) => `${entry.characterName}: ${entry.characterTruthShort} ${entry.chronicleEntry}`,
    );
  }

  return getLevelLore(targetLevelId)?.promptBullets ?? [];
}
