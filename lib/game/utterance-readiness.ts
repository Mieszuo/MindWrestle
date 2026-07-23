import { LEVEL_EMOTION_STATS } from "@/lib/game/level-emotions";
import type { EmotionState } from "@/lib/game/types";

export type ReadinessTier = "distant" | "warming" | "close" | "poised";

const INVERT_KEYS = new Set([
  "suspicion",
  "caution",
  "distance",
  "irritation",
  "stubbornness",
]);

const GOAL_PROGRESS_WEIGHT = 0.22;

/** Per-level sensitivity to hollow flattery (0–1, higher = harsher penalty). */
export const FLATTERY_SENSITIVITY: Record<number, number> = {
  1: 0.55,
  2: 0.75,
  3: 0.65,
  4: 0.7,
  5: 0.5,
  6: 0.9,
  7: 0.85,
};

export interface ReadinessModifiers {
  pressureThisTurn?: boolean;
  hollowFlattery?: boolean;
  flatteryStreak?: number;
  redLineTags?: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function emotionContribution(key: string, value: number): number {
  const normalized = INVERT_KEYS.has(key) ? 100 - value : value;
  return clamp(normalized, 0, 100);
}

export function computeUtteranceReadiness(
  levelId: number,
  emotions: EmotionState,
  goalProgress: number,
  modifiers?: ReadinessModifiers,
): number {
  const stats = LEVEL_EMOTION_STATS[levelId] ?? [];
  const emotionWeight = stats.length ? (1 - GOAL_PROGRESS_WEIGHT) / stats.length : 0;

  let score = clamp(goalProgress, 0, 100) * GOAL_PROGRESS_WEIGHT;

  for (const stat of stats) {
    const value = emotions[stat.key];
    if (typeof value !== "number") continue;
    score += emotionContribution(stat.key, value) * emotionWeight;
  }

  return clamp(applyReadinessModifiers(score, levelId, modifiers), 0, 100);
}

export function applyReadinessModifiers(
  base: number,
  levelId: number,
  modifiers?: ReadinessModifiers,
): number {
  if (!modifiers) return base;

  let adjusted = base;

  if (modifiers.pressureThisTurn) adjusted -= 8;
  if (modifiers.hollowFlattery) {
    const sensitivity = FLATTERY_SENSITIVITY[levelId] ?? 0.6;
    const streak = modifiers.flatteryStreak ?? 1;
    adjusted -= 6 * sensitivity * Math.min(streak, 3);
  }
  if (modifiers.redLineTags?.length) {
    adjusted -= 12 * modifiers.redLineTags.length;
  }

  return clamp(adjusted, 0, 100);
}

export function completionChance(readiness: number): number {
  return clamp(readiness * 0.75, 5, 80);
}

export function readinessTier(readiness: number): ReadinessTier {
  if (readiness >= 76) return "poised";
  if (readiness >= 56) return "close";
  if (readiness >= 31) return "warming";
  return "distant";
}
