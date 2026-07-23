import type { ResponseMode } from "@/lib/game/psychology/types";

export const VOICE_DIRECTIONS = [
  "softly",
  "quietly",
  "hesitantly",
  "amused",
  "angry but controlled",
  "warmly",
  "cautiously",
  "firmly",
  "mischievously",
  "solemnly",
  "thoughtfully",
  "sincerely",
  "distantly",
  "calmly",
  "authoritatively",
] as const;

export type VoiceDirection = (typeof VOICE_DIRECTIONS)[number];
export type VoiceDirectionSource = "rules" | "ai" | "authored";
export type VoiceSubtlety = "subtle" | "balanced" | "pronounced";

export interface VoicePerformance {
  direction: VoiceDirection;
  pauseAfterSentence: number[];
  subtlety: VoiceSubtlety;
  source: Exclude<VoiceDirectionSource, "rules">;
}

const DIRECTION_SET = new Set<string>(VOICE_DIRECTIONS);
const SUBTLETY_SET = new Set<string>(["subtle", "balanced", "pronounced"]);

function integerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((entry): entry is number => Number.isInteger(entry) && entry >= 0 && entry < 12)
      .map(Number),
  )].sort((a, b) => a - b).slice(0, 1);
}

export function parseVoicePerformance(
  value: unknown,
  source: VoicePerformance["source"] = "ai",
): VoicePerformance | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const direction = typeof record.direction === "string" ? record.direction : "";
  const subtlety = typeof record.subtlety === "string" ? record.subtlety : "";
  if (!DIRECTION_SET.has(direction) || !SUBTLETY_SET.has(subtlety)) return undefined;

  return {
    direction: direction as VoiceDirection,
    pauseAfterSentence: integerArray(record.pauseAfterSentence),
    subtlety: subtlety as VoiceSubtlety,
    source,
  };
}

export function voicePerformanceForResponse(
  performance: VoicePerformance | undefined,
  responseMode: ResponseMode | undefined,
): VoicePerformance | undefined {
  if (!performance) return undefined;
  if (performance.source === "authored") return performance;
  return responseMode === "crack_in_armor" || responseMode === "full_reveal"
    ? performance
    : undefined;
}

const AUTHORED_COMPLETION_PERFORMANCE: Record<number, VoicePerformance> = {
  1: { direction: "sincerely", pauseAfterSentence: [0], subtlety: "subtle", source: "authored" },
  2: { direction: "mischievously", pauseAfterSentence: [0], subtlety: "balanced", source: "authored" },
  3: { direction: "solemnly", pauseAfterSentence: [0], subtlety: "balanced", source: "authored" },
  4: { direction: "firmly", pauseAfterSentence: [0], subtlety: "subtle", source: "authored" },
  5: { direction: "thoughtfully", pauseAfterSentence: [0], subtlety: "balanced", source: "authored" },
  6: { direction: "authoritatively", pauseAfterSentence: [0], subtlety: "balanced", source: "authored" },
  7: { direction: "distantly", pauseAfterSentence: [0], subtlety: "subtle", source: "authored" },
};

export function authoredCompletionPerformance(levelId: number): VoicePerformance | undefined {
  return AUTHORED_COMPLETION_PERFORMANCE[levelId];
}
