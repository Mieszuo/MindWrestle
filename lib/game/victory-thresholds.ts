/** Client/server mirror of easier victory thresholds — keep in sync with migration. */

export interface VictoryThresholdOverride {
  minimumGoalProgress: number;
  requiredState?: Record<string, { min?: number; max?: number }>;
  startingEmotionPatch?: Record<string, number>;
}

export const VICTORY_OVERRIDES_BY_LEVEL: Record<number, VictoryThresholdOverride> = {
  1: {
    minimumGoalProgress: 18,
    requiredState: {
      trust: { min: 40 },
      suspicion: { max: 60 },
      patience: { min: 15 },
    },
    startingEmotionPatch: { trust: 52 },
  },
  2: { minimumGoalProgress: 30 },
  3: { minimumGoalProgress: 36 },
  4: { minimumGoalProgress: 38 },
  5: { minimumGoalProgress: 42 },
  6: { minimumGoalProgress: 46 },
  7: { minimumGoalProgress: 50 },
};

export function victoryOverrideForLevel(levelId: number): VictoryThresholdOverride | null {
  return VICTORY_OVERRIDES_BY_LEVEL[levelId] ?? null;
}

export function applyVictoryThresholdOverrides(
  levelId: number,
  objectiveConfig: Record<string, unknown>,
): Record<string, unknown> {
  const override = victoryOverrideForLevel(levelId);
  if (!override) return objectiveConfig;

  const merged: Record<string, unknown> = { ...objectiveConfig, minimumGoalProgress: override.minimumGoalProgress };

  if (override.requiredState) {
    const existing =
      objectiveConfig.requiredState && typeof objectiveConfig.requiredState === "object" && !Array.isArray(objectiveConfig.requiredState)
        ? (objectiveConfig.requiredState as Record<string, unknown>)
        : {};

    const requiredState: Record<string, unknown> = { ...existing };
    for (const [emotion, rules] of Object.entries(override.requiredState)) {
      const prev =
        requiredState[emotion] && typeof requiredState[emotion] === "object" && !Array.isArray(requiredState[emotion])
          ? (requiredState[emotion] as Record<string, unknown>)
          : {};
      requiredState[emotion] = { ...prev, ...rules };
    }
    merged.requiredState = requiredState;
  }

  return merged;
}

export function applyStartingEmotionPatch(
  levelId: number,
  startingEmotion: Record<string, number>,
): Record<string, number> {
  const patch = victoryOverrideForLevel(levelId)?.startingEmotionPatch;
  if (!patch) return startingEmotion;
  return { ...startingEmotion, ...patch };
}

export function minimumGoalProgressForLevel(levelId: number, objectiveConfig: Record<string, unknown>): number {
  const resolved = applyVictoryThresholdOverrides(levelId, objectiveConfig);
  const value = Number(resolved.minimumGoalProgress);
  return Number.isFinite(value) ? value : 0;
}
