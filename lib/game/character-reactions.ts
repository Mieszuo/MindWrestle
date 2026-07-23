import type { CharacterReaction } from "@/lib/audio/audio-types";

export function inferCharacterReaction(
  emotionDelta: Record<string, number> | undefined,
  options?: { completed?: boolean; defeated?: boolean },
): CharacterReaction | null {
  if (options?.completed) return "breakthrough";
  if (options?.defeated) return "annoyed";
  if (!emotionDelta) return null;

  let negative = 0;
  let positive = 0;
  for (const value of Object.values(emotionDelta)) {
    if (value < 0) negative += value;
    if (value > 0) positive += value;
  }

  if (negative <= -12) return "annoyed";
  if (positive >= 10) return "interested";
  if (negative <= -6 || positive >= 6) return "unsure";
  return null;
}
