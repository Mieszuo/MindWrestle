import type { EmotionState } from "@/lib/game/types";

const DEFAULT_LIMIT = { min: -10, max: 10 };
const DELTA_LIMITS: Record<string, { min: number; max: number }> = {
  patience: { min: -20, max: 20 },
  trust: { min: -20, max: 20 },
  suspicion: { min: -20, max: 20 },
  ego: { min: -15, max: 15 },
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function applyEmotionDelta(state: EmotionState, delta: EmotionState): EmotionState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      const limits = DELTA_LIMITS[key] ?? DEFAULT_LIMIT;
      const rawDelta = Number(delta[key] ?? 0);
      const safeDelta = clamp(Number.isFinite(rawDelta) ? rawDelta : 0, limits.min, limits.max);
      return [key, clamp(value + safeDelta, 0, 100)];
    }),
  );
}

export function asEmotionState(value: unknown): EmotionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, Number(entry)] as const)
      .filter(([, entry]) => Number.isFinite(entry))
      .map(([key, entry]) => [key, clamp(entry, 0, 100)]),
  );
}
