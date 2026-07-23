import { detectLevelRedLines, mergeEmotionBurst } from "@/lib/game/resistance-triggers";
import type { EmotionState } from "@/lib/game/types";
import type { PsychJudgeOutput } from "@/lib/game/psychology/mock-psych-judge";

export function mergeRedLinesIntoJudge(
  judge: PsychJudgeOutput,
  levelId: number,
  playerMessage: string,
  directTarget: boolean,
): { judge: PsychJudgeOutput; redLineHit: boolean } {
  const redLines = detectLevelRedLines(levelId, playerMessage.toLowerCase(), {
    directTarget,
    messageLength: playerMessage.length,
  });
  if (!redLines.length) {
    return { judge, redLineHit: false };
  }

  const tags = redLines.map((line) => line.tag);
  const newRedLines = redLines.filter((line) => !judge.reactionTags.includes(line.tag));
  const burst = newRedLines.reduce<EmotionState>(
    (acc, line) => mergeEmotionBurst(acc, line.emotionBurst),
    {},
  );
  const reactionTags = [...new Set([...tags, ...judge.reactionTags])];

  return {
    judge: {
      ...judge,
      emotionDelta: Object.keys(burst).length ? mergeEmotionBurst(judge.emotionDelta, burst) : judge.emotionDelta,
      reactionTags,
      resistanceTriggered: judge.resistanceTriggered || true,
      memoryPatch: redLines.length
        ? `Player hit a red line: ${redLines.map((line) => line.label).join(", ")}.`
        : judge.memoryPatch,
    },
    redLineHit: true,
  };
}
