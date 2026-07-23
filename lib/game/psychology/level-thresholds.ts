export interface LevelObjectiveThresholds {
  pressureMinimum: number;
  secretRevealPressure: number;
  rollPressure: number;
  fallbackPressure: number;
  concessionLikelyRatio: number;
  responseScoreBonus: number;
  legacyReadinessMinimum: number;
  legacyFallbackReadiness: number;
}

const DEFAULT_THRESHOLDS: LevelObjectiveThresholds = {
  pressureMinimum: 45,
  secretRevealPressure: 45,
  rollPressure: 65,
  fallbackPressure: 78,
  concessionLikelyRatio: 0.6,
  responseScoreBonus: 0,
  legacyReadinessMinimum: 45,
  legacyFallbackReadiness: 78,
};

/** Progressive difficulty: Mila ~2–3 turns, Trader ~5, up to God ~13–15. */
export const LEVEL_OBJECTIVE_THRESHOLDS: Record<number, LevelObjectiveThresholds> = {
  1: {
    pressureMinimum: 10,
    secretRevealPressure: 10,
    rollPressure: 16,
    fallbackPressure: 26,
    concessionLikelyRatio: 0.35,
    responseScoreBonus: 16,
    legacyReadinessMinimum: 20,
    legacyFallbackReadiness: 28,
  },
  2: {
    pressureMinimum: 22,
    secretRevealPressure: 22,
    rollPressure: 28,
    fallbackPressure: 38,
    concessionLikelyRatio: 0.42,
    responseScoreBonus: 12,
    legacyReadinessMinimum: 26,
    legacyFallbackReadiness: 38,
  },
  3: {
    pressureMinimum: 26,
    secretRevealPressure: 26,
    rollPressure: 32,
    fallbackPressure: 42,
    concessionLikelyRatio: 0.44,
    responseScoreBonus: 10,
    legacyReadinessMinimum: 30,
    legacyFallbackReadiness: 42,
  },
  4: {
    pressureMinimum: 28,
    secretRevealPressure: 28,
    rollPressure: 34,
    fallbackPressure: 44,
    concessionLikelyRatio: 0.46,
    responseScoreBonus: 8,
    legacyReadinessMinimum: 32,
    legacyFallbackReadiness: 44,
  },
  5: {
    pressureMinimum: 32,
    secretRevealPressure: 32,
    rollPressure: 38,
    fallbackPressure: 48,
    concessionLikelyRatio: 0.48,
    responseScoreBonus: 6,
    legacyReadinessMinimum: 36,
    legacyFallbackReadiness: 48,
  },
  6: {
    pressureMinimum: 36,
    secretRevealPressure: 36,
    rollPressure: 40,
    fallbackPressure: 50,
    concessionLikelyRatio: 0.5,
    responseScoreBonus: 4,
    legacyReadinessMinimum: 40,
    legacyFallbackReadiness: 50,
  },
  7: {
    pressureMinimum: 40,
    secretRevealPressure: 40,
    rollPressure: 44,
    fallbackPressure: 54,
    concessionLikelyRatio: 0.52,
    responseScoreBonus: 2,
    legacyReadinessMinimum: 44,
    legacyFallbackReadiness: 54,
  },
};

export function objectiveThresholdsForLevel(levelId: number): LevelObjectiveThresholds {
  return LEVEL_OBJECTIVE_THRESHOLDS[levelId] ?? DEFAULT_THRESHOLDS;
}
