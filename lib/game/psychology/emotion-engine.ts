import { applyEmotionDelta, clamp } from "@/lib/game/emotions";
import type { EmotionState } from "@/lib/game/types";

const POLE_PAIRS: Array<{ positive: string; negative: string; factor: number }> = [
  { positive: "trust", negative: "suspicion", factor: 0.5 },
  { positive: "respect", negative: "irritation", factor: 0.35 },
  { positive: "pride", negative: "patience", factor: 0.25 },
  { positive: "ego", negative: "respect", factor: 0.2 },
];

const INERTIA_KEYS = new Set([
  "trust",
  "suspicion",
  "patience",
  "pride",
  "ego",
  "respect",
  "stubbornness",
  "caution",
  "interest",
  "curiosity",
  "attention",
  "insight",
  "distance",
  "irritation",
  "bargain",
]);

function scaleDeltaByInertia(key: string, current: number, rawDelta: number): number {
  if (!INERTIA_KEYS.has(key) || rawDelta === 0) return rawDelta;
  const resistance = current / 100;
  const direction = rawDelta > 0 ? 1 - resistance * 0.85 : 1 - (1 - resistance) * 0.35;
  return rawDelta * Math.max(0.15, direction);
}

export function applyPoleCoupling(delta: EmotionState): EmotionState {
  const next = { ...delta };
  for (const { positive, negative, factor } of POLE_PAIRS) {
    const positiveDelta = next[positive] ?? 0;
    if (positiveDelta > 0) {
      next[negative] = (next[negative] ?? 0) - positiveDelta * factor;
    }
    const negativeDelta = next[negative] ?? 0;
    if (negativeDelta > 0) {
      next[positive] = (next[positive] ?? 0) - negativeDelta * factor;
    }
  }
  return next;
}

export function regulateEmotionDelta(state: EmotionState, delta: EmotionState): EmotionState {
  const withInertia = Object.fromEntries(
    Object.entries(delta).map(([key, value]) => {
      const current = state[key] ?? 50;
      return [key, scaleDeltaByInertia(key, current, value)];
    }),
  );
  return applyPoleCoupling(withInertia);
}

export function applyRegulatedEmotionDelta(state: EmotionState, delta: EmotionState): EmotionState {
  const regulated = regulateEmotionDelta(state, delta);
  return applyEmotionDelta(state, regulated);
}

export function decayEmotionsTowardBaseline(
  state: EmotionState,
  baseline: EmotionState,
  decay = 0.08,
): EmotionState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      const base = baseline[key] ?? value;
      return [key, clamp(Math.round(value * (1 - decay) + base * decay), 0, 100)];
    }),
  );
}
