import type { EmotionMoodTone } from "@/lib/game/level-emotions";
import { Character, LevelObjective } from "@/lib/game/types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export interface CharacterCardContent {
  personality: string;
  history: string;
  howToTalk: string;
  works: string[];
  avoid: string[];
  hint: string;
}

export function getCharacterCard(
  character: Character,
  objective: LevelObjective,
  levelId: number | undefined,
  locale: Locale,
): CharacterCardContent {
  const content = getDictionary(locale).content.characterCard;
  const levelKey = levelId ? (String(levelId) as keyof typeof content.levels) : undefined;
  const levelOverride = levelKey ? content.levels[levelKey] : undefined;

  return {
    personality: levelOverride?.personality ?? character.personality,
    history: levelOverride?.history ?? content.defaultHistory,
    howToTalk: levelOverride?.howToTalk ?? content.defaultNotes.howToTalk,
    works: levelOverride ? [...levelOverride.works] : [...content.defaultNotes.works],
    avoid: levelOverride ? [...levelOverride.avoid] : [...content.defaultNotes.avoid],
    hint: levelOverride?.hint ?? objective.hint,
  };
}

export type MoodTone = "trust" | "suspicion" | "patience";

export function moodWhisper(tone: MoodTone | EmotionMoodTone, value: number, locale: Locale): string {
  const content = getDictionary(locale).content.characterCard.moodWhispers;

  if (tone === "trust") {
    if (value >= 70) return content.trust.high;
    if (value >= 45) return content.trust.mid;
    return content.trust.low;
  }
  if (tone === "suspicion") {
    if (value >= 60) return content.suspicion.high;
    if (value >= 35) return content.suspicion.mid;
    return content.suspicion.low;
  }
  if (tone === "patience") {
    if (value >= 65) return content.patience.high;
    if (value >= 40) return content.patience.mid;
    return content.patience.low;
  }
  if (tone === "interest") {
    if (value >= 65) return content.interest.high;
    if (value >= 40) return content.interest.mid;
    return content.interest.low;
  }
  if (tone === "caution") {
    if (value >= 65) return content.caution.high;
    if (value >= 40) return content.caution.mid;
    return content.caution.low;
  }
  if (tone === "bargain") {
    if (value >= 65) return content.bargain.high;
    if (value >= 40) return content.bargain.mid;
    return content.bargain.low;
  }
  if (tone === "respect") {
    if (value >= 65) return content.respect.high;
    if (value >= 40) return content.respect.mid;
    return content.respect.low;
  }
  if (tone === "pride") {
    if (value >= 70) return content.pride.high;
    if (value >= 45) return content.pride.mid;
    return content.pride.low;
  }
  if (tone === "ego") {
    if (value >= 70) return content.ego.high;
    if (value >= 45) return content.ego.mid;
    return content.ego.low;
  }
  if (tone === "stubbornness") {
    if (value >= 70) return content.stubbornness.high;
    if (value >= 45) return content.stubbornness.mid;
    return content.stubbornness.low;
  }
  if (tone === "irritation") {
    if (value >= 65) return content.irritation.high;
    if (value >= 40) return content.irritation.mid;
    return content.irritation.low;
  }
  if (tone === "curiosity") {
    if (value >= 65) return content.curiosity.high;
    if (value >= 40) return content.curiosity.mid;
    return content.curiosity.low;
  }
  if (tone === "attention") {
    if (value >= 65) return content.attention.high;
    if (value >= 40) return content.attention.mid;
    return content.attention.low;
  }
  if (tone === "insight") {
    if (value >= 65) return content.insight.high;
    if (value >= 40) return content.insight.mid;
    return content.insight.low;
  }
  if (tone === "distance") {
    if (value >= 65) return content.distance.high;
    if (value >= 40) return content.distance.mid;
    return content.distance.low;
  }
  return value >= 55 ? content.default.stable : content.default.unstable;
}
