import type { DefeatConfig } from "@/lib/game/defeat";
import { applyEmotionDelta, asEmotionState } from "@/lib/game/emotions";
import { LEVEL_STARTING_EMOTIONS } from "@/lib/game/level-emotions";
import { parseReputationContext } from "@/lib/game/reputation";
import type { EmotionState } from "@/lib/game/types";
import type { Json } from "@/lib/supabase/database.types";

/** Client-side mirror of game_levels.defeat_config — keep in sync with migration. */
export const DEFEAT_CONFIG_BY_LEVEL: Record<number, DefeatConfig> = {
  1: {
    logic: "any",
    triggers: [
      { emotion: "patience", op: "lte", value: 55 },
      { emotion: "suspicion", op: "gte", value: 36 },
    ],
  },
  2: {
    logic: "any",
    triggers: [
      { emotion: "interest", op: "lte", value: 38 },
      { emotion: "caution", op: "gte", value: 65 },
      { emotion: "interest", op: "lte", value: 45, requiresReactionTag: "desperate_bargain" },
    ],
  },
  3: {
    logic: "any",
    triggers: [
      { emotion: "respect", op: "lte", value: 40 },
      { emotion: "patience", op: "lte", value: 50 },
      { emotion: "respect", op: "lte", value: 45, requiresReactionTag: "honor_wound" },
    ],
  },
  4: {
    logic: "any",
    triggers: [
      { emotion: "irritation", op: "gte", value: 52 },
      { emotion: "respect", op: "lte", value: 30 },
      { emotion: "irritation", op: "gte", value: 45, requiresReactionTag: "coward_accusation" },
    ],
  },
  5: {
    logic: "any",
    triggers: [
      { emotion: "patience", op: "lte", value: 52 },
      { emotion: "curiosity", op: "lte", value: 40 },
      { emotion: "curiosity", op: "lte", value: 45, requiresReactionTag: "rushed_arrogance" },
    ],
  },
  6: {
    logic: "any",
    triggers: [
      { emotion: "respect", op: "lte", value: 38 },
      { emotion: "patience", op: "lte", value: 50 },
      { emotion: "ego", op: "lte", value: 55, requiresReactionTag: "ego_insult" },
      { emotion: "ego", op: "lte", value: 42 },
    ],
  },
  7: {
    logic: "any",
    triggers: [
      { emotion: "distance", op: "gte", value: 78 },
      { emotion: "attention", op: "lte", value: 38 },
      { emotion: "attention", op: "lte", value: 32, requiresReactionTag: "dominance_play" },
    ],
  },
};

const NEAR_DEFEAT_MARGIN = 8;
const BUFFER_SHRINK_PER_TURN = 2;

/** Entry buffer when reputation already pushed emotions toward defeat at conversation start. */
export function defeatEntryBufferForLevel(levelId: number): number {
  return 8 + levelId * 2;
}

export function startingEmotionForAttempt(
  levelId: number,
  reputationContext: Json | null | undefined,
  fallback?: EmotionState,
): EmotionState {
  const baseline = asEmotionState(LEVEL_STARTING_EMOTIONS[levelId] ?? LEVEL_STARTING_EMOTIONS[1]!);
  const ctx = parseReputationContext(reputationContext);
  if (!ctx?.emotionAdjustments || Object.keys(ctx.emotionAdjustments).length === 0) {
    return fallback ?? baseline;
  }
  return applyEmotionDelta(baseline, ctx.emotionAdjustments);
}

export function applyDefeatDilation(
  config: DefeatConfig,
  startingEmotion: EmotionState,
  levelId: number,
  turnsCount: number,
): DefeatConfig {
  const baseBuffer = defeatEntryBufferForLevel(levelId);
  const activeBuffer = Math.max(0, baseBuffer - turnsCount * BUFFER_SHRINK_PER_TURN);
  if (activeBuffer <= 0) return config;

  return {
    ...config,
    triggers: config.triggers.map((trigger) => {
      const start = startingEmotion[trigger.emotion];
      if (typeof start !== "number") return trigger;

      if (trigger.op === "gte") {
        if (start >= trigger.value - NEAR_DEFEAT_MARGIN) {
          return { ...trigger, value: trigger.value + activeBuffer };
        }
      } else if (trigger.op === "lte") {
        if (start <= trigger.value + NEAR_DEFEAT_MARGIN) {
          return { ...trigger, value: Math.max(0, trigger.value - activeBuffer) };
        }
      }

      return trigger;
    }),
  };
}

export function resolveDefeatConfig(
  levelId: number,
  startingEmotion?: EmotionState | null,
  turnsCount = 0,
): DefeatConfig {
  const base = defeatConfigForLevel(levelId);
  if (!startingEmotion) return base;
  return applyDefeatDilation(base, startingEmotion, levelId, turnsCount);
}

const WARNING_MARGIN = 15;

export type EmotionBarDanger = "comfortable" | "uneasy" | "critical";

export function defeatConfigForLevel(levelId: number): DefeatConfig {
  return DEFEAT_CONFIG_BY_LEVEL[levelId] ?? DEFEAT_CONFIG_BY_LEVEL[1]!;
}

export function getEmotionBarDanger(levelId: number, emotionKey: string, value: number): EmotionBarDanger {
  const config = defeatConfigForLevel(levelId);
  let danger: EmotionBarDanger = "comfortable";

  for (const trigger of config.triggers) {
    if (trigger.emotion !== emotionKey || trigger.requiresReactionTag) continue;

    if (trigger.op === "lte") {
      if (value <= trigger.value) return "critical";
      if (value <= trigger.value + WARNING_MARGIN) danger = "uneasy";
    } else if (trigger.op === "gte") {
      if (value >= trigger.value) return "critical";
      if (value >= trigger.value - WARNING_MARGIN) danger = "uneasy";
    }
  }

  return danger;
}

export function isAtDefeatThreshold(levelId: number, emotionKey: string, value: number): boolean {
  return getEmotionBarDanger(levelId, emotionKey, value) === "critical";
}
