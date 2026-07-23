import type { MoodTone } from "@/lib/game/character-card";
import type { EmotionState } from "@/lib/game/types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export type EmotionMoodTone =
  | MoodTone
  | "interest"
  | "caution"
  | "respect"
  | "pride"
  | "ego"
  | "curiosity"
  | "attention"
  | "insight"
  | "stubbornness"
  | "irritation"
  | "bargain"
  | "distance";

export interface LevelEmotionStat {
  key: string;
  label: string;
  tone: EmotionMoodTone;
}

/** Matches game_levels.starting_emotion_state in DB seed/migrations. */
export const LEVEL_STARTING_EMOTIONS: Record<number, EmotionState> = {
  1: { trust: 52, suspicion: 25, patience: 80 },
  2: { interest: 45, caution: 55, bargain: 35 },
  3: { respect: 45, pride: 70, patience: 65 },
  4: { respect: 35, stubbornness: 75, irritation: 35 },
  5: { curiosity: 50, caution: 50, patience: 70 },
  6: { respect: 40, ego: 75, patience: 60 },
  7: { attention: 45, insight: 80, distance: 70 },
};

export const LEVEL_EMOTION_STATS: Record<number, LevelEmotionStat[]> = {
  1: [
    { key: "trust", label: "Zaufanie", tone: "trust" },
    { key: "suspicion", label: "Podejrzliwość", tone: "suspicion" },
    { key: "patience", label: "Cierpliwość", tone: "patience" },
  ],
  2: [
    { key: "interest", label: "Zainteresowanie", tone: "interest" },
    { key: "caution", label: "Ostrożność", tone: "caution" },
    { key: "bargain", label: "Chęć targu", tone: "bargain" },
  ],
  3: [
    { key: "respect", label: "Szacunek", tone: "respect" },
    { key: "pride", label: "Duma", tone: "pride" },
    { key: "patience", label: "Cierpliwość", tone: "patience" },
  ],
  4: [
    { key: "respect", label: "Szacunek", tone: "respect" },
    { key: "stubbornness", label: "Upór", tone: "stubbornness" },
    { key: "irritation", label: "Drażliwość", tone: "irritation" },
  ],
  5: [
    { key: "curiosity", label: "Ciekawość", tone: "curiosity" },
    { key: "caution", label: "Ostrożność", tone: "caution" },
    { key: "patience", label: "Cierpliwość", tone: "patience" },
  ],
  6: [
    { key: "respect", label: "Szacunek", tone: "respect" },
    { key: "ego", label: "Ego", tone: "ego" },
    { key: "patience", label: "Cierpliwość", tone: "patience" },
  ],
  7: [
    { key: "attention", label: "Uwaga", tone: "attention" },
    { key: "insight", label: "Wgląd", tone: "insight" },
    { key: "distance", label: "Dystans", tone: "distance" },
  ],
};

export function statsFromLevelEmotion(
  levelId: number,
  emotionState: EmotionState | null,
): Array<{ key: string; label: string; value: number; tone: EmotionMoodTone }> {
  const defs = LEVEL_EMOTION_STATS[levelId] ?? LEVEL_EMOTION_STATS[1]!;
  const baseline = LEVEL_STARTING_EMOTIONS[levelId] ?? LEVEL_STARTING_EMOTIONS[1]!;
  const activeState = emotionState && Object.keys(emotionState).length > 0 ? emotionState : baseline;

  return defs.map((def) => ({
    key: def.key,
    label: def.label,
    value: activeState[def.key] ?? baseline[def.key] ?? 50,
    tone: def.tone,
  }));
}

/**
 * Localized display labels for a level's emotion stats. Note: LEVEL_EMOTION_STATS itself
 * (and the `label` field baked into it) stays Polish/untranslated — it's also consumed
 * as engine data (e.g. character-speech.ts prompt text), not just for display. This
 * function pulls a separate, locale-aware label dictionary keyed by stat `key`.
 * Callers overlay this onto statsFromLevelEmotion's output by array index — both
 * functions iterate LEVEL_EMOTION_STATS[levelId] (falling back to [1]) in the same
 * order, so indices stay aligned. Keep that iteration order in sync if either changes.
 */
export function getLevelEmotionLabels(levelId: number, locale: Locale): string[] {
  const defs = LEVEL_EMOTION_STATS[levelId] ?? LEVEL_EMOTION_STATS[1]!;
  const dict = getDictionary(locale).content.levelEmotions.labels;
  const levelKey = String(levelId) as keyof typeof dict;
  const levelLabels = (dict[levelKey] ?? dict["1"]) as Record<string, string>;

  return defs.map((def) => levelLabels[def.key] ?? def.label);
}
