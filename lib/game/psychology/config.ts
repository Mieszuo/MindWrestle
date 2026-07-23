export function isPsychEngineEnabled() {
  return process.env.PSYCH_ENGINE_ENABLED === "true";
}

export function isInnerMonologueEnabled() {
  return isPsychEngineEnabled() && process.env.PSYCH_INNER_MONOLOGUE === "true";
}

export const MEMORY_SUMMARY_MAX_LENGTH = 400;
export const SHORT_TERM_TRACE_DECAY = 0.9;

export const OBJECTIVE_THRESHOLDS = {
  targetUtteranceSecretPressure: 22,
  secretRevealPressure: 32,
  beliefShiftMinimum: 32,
  partialConcessionMode: "defensive_deflection" as const,
  fallbackPressure: 78,
  rollPressure: 65,
};

export { objectiveThresholdsForLevel, LEVEL_OBJECTIVE_THRESHOLDS } from "@/lib/game/psychology/level-thresholds";
