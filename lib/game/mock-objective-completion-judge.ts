import { evaluateStrictObjectiveMet } from "@/lib/game/strict-objective-met";

type ObjectiveConfig = Record<string, unknown>;

export function mockObjectiveCompletionJudge({
  levelId,
  objectiveType,
  objectiveConfig,
  characterConfig,
  characterMessage,
  recentContext,
}: {
  levelId: number;
  objectiveType: string;
  objectiveConfig: ObjectiveConfig;
  characterConfig?: unknown;
  characterMessage: string;
  recentContext: string;
}) {
  return evaluateStrictObjectiveMet({
    levelId,
    objectiveType,
    objectiveConfig,
    characterConfig,
    characterMessage,
    recentContext,
  });
}
