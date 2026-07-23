import { containsExactWord } from "@/lib/game/text-validator";
import { completionChance } from "@/lib/game/utterance-readiness";
import type { EmotionState } from "@/lib/game/types";
import { applyVictoryThresholdOverrides } from "@/lib/game/victory-thresholds";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

type ObjectiveConfig = Record<string, unknown>;

export function resolveObjectiveConfig(levelId: number, rawFromDb: ObjectiveConfig): ObjectiveConfig {
  return applyVictoryThresholdOverrides(levelId, rawFromDb);
}

function numberAt(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function targetPhraseFromObjective(config: ObjectiveConfig) {
  const phrase = config.targetPhrase;
  return typeof phrase === "string" && phrase.trim() ? phrase.trim() : null;
}

/** @deprecated Use utterance readiness tiers for coaching hints only. */
export function meetsObjectiveState(config: ObjectiveConfig, emotionState: EmotionState, goalProgress: number) {
  const minimumGoalProgress = numberAt(config.minimumGoalProgress) ?? 0;
  if (goalProgress < minimumGoalProgress) return false;

  const requiredState = config.requiredState;
  if (!requiredState || typeof requiredState !== "object" || Array.isArray(requiredState)) return true;

  return Object.entries(requiredState).every(([key, rules]) => {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return true;
    const stateValue = emotionState[key] ?? 0;
    const min = numberAt((rules as Record<string, unknown>).min);
    const max = numberAt((rules as Record<string, unknown>).max);
    if (min !== null && stateValue < min) return false;
    if (max !== null && stateValue > max) return false;
    return true;
  });
}

export function containsTargetPhrase(message: string, config: ObjectiveConfig) {
  const targetPhrase = targetPhraseFromObjective(config);
  if (!targetPhrase) return false;

  const acceptedVariants = Array.isArray(config.acceptedVariants)
    ? config.acceptedVariants.filter((entry): entry is string => typeof entry === "string")
    : [targetPhrase];

  return acceptedVariants.some((variant) => containsExactWord(message, variant));
}

export interface ObjectiveCompletionInput {
  objectiveType: string;
  objectiveConfig: ObjectiveConfig;
  characterMessage: string;
  readiness: number;
  judgeConceded: boolean;
  objectiveMetByJudge: boolean;
  completionRoll: number;
  fallbackUsed: boolean;
}

export interface ObjectiveCompletionResult {
  completed: boolean;
  usedFallback: boolean;
  rejectEarlyTarget: boolean;
}

export function evaluateObjectiveCompletion(input: ObjectiveCompletionInput): ObjectiveCompletionResult {
  const {
    objectiveType,
    objectiveConfig,
    characterMessage,
    readiness,
    judgeConceded,
    objectiveMetByJudge,
    completionRoll,
    fallbackUsed,
  } = input;

  const hasPhrase = containsTargetPhrase(characterMessage, objectiveConfig);
  const rollWins = completionRoll < completionChance(readiness);
  const canFallback = readiness >= 78 && !fallbackUsed;

  if (objectiveType === "TARGET_UTTERANCE") {
    if (hasPhrase && readiness < 35) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: true };
    }
    if (hasPhrase && readiness >= 35) {
      return { completed: true, usedFallback: false, rejectEarlyTarget: false };
    }
    if (canFallback) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    if (readiness >= 65 && rollWins) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }

  if (!judgeConceded || readiness < 38) {
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }
  if (!objectiveMetByJudge) {
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }
  if (canFallback) {
    return { completed: true, usedFallback: true, rejectEarlyTarget: false };
  }
  if (readiness >= 65 && rollWins) {
    return { completed: true, usedFallback: true, rejectEarlyTarget: false };
  }

  return { completed: true, usedFallback: false, rejectEarlyTarget: false };
}

export { evaluatePsychObjectiveCompletion } from "@/lib/game/psychology/objective-pressure";
export type { PsychObjectiveCompletionInput, PsychObjectiveCompletionResult } from "@/lib/game/psychology/objective-pressure";

export function buildTargetUtteranceFallback(
  levelId: number,
  characterName: string,
  objectiveConfig: ObjectiveConfig,
  locale: Locale,
): string {
  const { targetUtterance } = getDictionary(locale).content.fallbackDialogue;
  const phrase = targetPhraseFromObjective(objectiveConfig);
  if (!phrase) {
    return targetUtterance.genericNoTarget(characterName);
  }

  const template = targetUtterance.templates[String(levelId) as keyof typeof targetUtterance.templates];

  return template ? template(phrase) : targetUtterance.genericWithTarget(characterName, phrase);
}

/** @deprecated Replaced by evaluateObjectiveCompletion. */
export function isTargetUtteranceCompleted({
  characterMessage,
  objectiveConfig,
  victoryUnlocked,
}: {
  characterMessage: string;
  objectiveConfig: ObjectiveConfig;
  victoryUnlocked: boolean;
}) {
  return victoryUnlocked && containsTargetPhrase(characterMessage, objectiveConfig);
}
