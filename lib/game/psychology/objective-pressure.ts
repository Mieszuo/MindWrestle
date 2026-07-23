import { completionChance } from "@/lib/game/utterance-readiness";
import {
  isPriceNegotiation,
  negotiatedPriceMet,
} from "@/lib/game/objective-completion-helpers";
import { containsTargetPhrase } from "@/lib/game/objectives";
import { OBJECTIVE_THRESHOLDS, objectiveThresholdsForLevel } from "@/lib/game/psychology/config";
import { forbiddenDirectReveal } from "@/lib/game/psychology/response-mode";
import { responseModeRank, type ResponseMode } from "@/lib/game/psychology/types";

export interface PsychObjectiveCompletionInput {
  levelId: number;
  objectiveType: string;
  objectiveConfig: Record<string, unknown>;
  characterConfig?: unknown;
  characterMessage: string;
  objectivePressure: number;
  responseMode: ResponseMode;
  judgeConceded: boolean;
  objectiveMetByJudge: boolean;
  completionRoll: number;
  fallbackUsed: boolean;
  loreEvaluation?: {
    usedTruthIds: string[];
    rejectedTruthIds: string[];
    useQuality: string;
    useMode: string;
    gateStatus: string;
    blockReason: string;
  };
}

export interface PsychObjectiveCompletionResult {
  completed: boolean;
  usedFallback: boolean;
  rejectEarlyTarget: boolean;
  blockReason?: string;
}

function modeMeetsPartialThreshold(responseMode: ResponseMode): boolean {
  return responseModeRank(responseMode) >= responseModeRank(OBJECTIVE_THRESHOLDS.partialConcessionMode);
}

function playerReadyForObjective(
  objectiveType: string,
  judgeConceded: boolean,
  objectivePressure: number,
  pressureMinimum: number,
  objectiveMetByJudge: boolean,
): boolean {
  if (judgeConceded || objectivePressure >= pressureMinimum) return true;
  if (objectiveType === "CONCESSION" || objectiveType === "TARGET_UTTERANCE") {
    return objectiveMetByJudge;
  }
  return false;
}

export function evaluatePsychObjectiveCompletion(
  input: PsychObjectiveCompletionInput,
): PsychObjectiveCompletionResult {
  const {
    levelId,
    objectiveType,
    objectiveConfig,
    characterMessage,
    objectivePressure,
    responseMode,
    judgeConceded,
    objectiveMetByJudge,
    completionRoll,
    fallbackUsed,
  } = input;

  const thresholds = objectiveThresholdsForLevel(levelId);
  const hasPhrase = containsTargetPhrase(characterMessage, objectiveConfig);
  const rollWins = completionRoll < completionChance(objectivePressure);
  const canFallback = objectivePressure >= thresholds.fallbackPressure && !fallbackUsed;
  const modeAllowsReveal = !forbiddenDirectReveal(responseMode);
  const modeReady = modeMeetsPartialThreshold(responseMode);
  const priceMet = isPriceNegotiation(objectiveConfig) && negotiatedPriceMet(characterMessage, objectiveConfig);
  const playerReady = playerReadyForObjective(
    objectiveType,
    judgeConceded,
    objectivePressure,
    thresholds.pressureMinimum,
    objectiveMetByJudge,
  );

  const minimumLoreEvidenceCount = Number(objectiveConfig.minimumLoreEvidenceCount) || 0;
  const requireLoreCategories = objectiveConfig.requireLoreCategories === true;
  const genericPersuasionCanWin = objectiveConfig.genericPersuasionCanWin !== false;

  const usedTruthIds = input.loreEvaluation?.usedTruthIds ?? [];
  const usedLoreCount = usedTruthIds.length;

  // Simple approximation: if we need categories, assume different truth IDs come from different levels.
  // We can refine this by fetching getLoreFragment, but truthIds map 1:1 to levels in this game.
  const distinctCategories = new Set(usedTruthIds).size;
  const loreGatePassed = usedLoreCount >= minimumLoreEvidenceCount && (!requireLoreCategories || distinctCategories >= 3);

  if (!loreGatePassed && !genericPersuasionCanWin) {
    if (input.loreEvaluation) {
      input.loreEvaluation.gateStatus = "blocked";
      input.loreEvaluation.blockReason = "INSUFFICIENT_LORE_EVIDENCE";
    }
    return { completed: false, usedFallback: false, rejectEarlyTarget: false, blockReason: "INSUFFICIENT_LORE_EVIDENCE" };
  }

  if (input.loreEvaluation) {
    input.loreEvaluation.gateStatus = "passed";
  }

  if (objectiveType === "TARGET_UTTERANCE") {
    if (hasPhrase && objectivePressure < OBJECTIVE_THRESHOLDS.targetUtteranceSecretPressure) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: true };
    }
    if (hasPhrase && objectivePressure >= OBJECTIVE_THRESHOLDS.targetUtteranceSecretPressure && modeAllowsReveal) {
      return { completed: true, usedFallback: false, rejectEarlyTarget: false };
    }
    if (canFallback && modeReady) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    if (objectivePressure >= thresholds.rollPressure && rollWins && modeReady) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }

  if (isPriceNegotiation(objectiveConfig)) {
    if (!playerReady) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!priceMet && !objectiveMetByJudge) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!modeReady && !objectiveMetByJudge) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (canFallback) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    if (objectivePressure >= thresholds.rollPressure && rollWins) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    return { completed: true, usedFallback: false, rejectEarlyTarget: false };
  }

  if (objectiveType === "SECRET_REVEAL") {
    if (!objectiveMetByJudge) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!playerReady) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!modeReady) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (canFallback) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    if (objectivePressure >= thresholds.rollPressure && rollWins) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    return { completed: true, usedFallback: false, rejectEarlyTarget: false };
  }

  if (objectiveType === "AGREEMENT") {
    if (!objectiveMetByJudge) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!playerReady) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (!modeReady) {
      return { completed: false, usedFallback: false, rejectEarlyTarget: false };
    }
    if (canFallback) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    if (objectivePressure >= thresholds.rollPressure && rollWins) {
      return { completed: true, usedFallback: true, rejectEarlyTarget: false };
    }
    return { completed: true, usedFallback: false, rejectEarlyTarget: false };
  }

  // CONCESSION — treść odpowiedzi jest najważniejsza; nie blokuj trybem, gdy cel już spełniony
  if (!objectiveMetByJudge) {
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }
  if (!playerReady) {
    return { completed: false, usedFallback: false, rejectEarlyTarget: false };
  }
  if (canFallback) {
    return { completed: true, usedFallback: true, rejectEarlyTarget: false };
  }
  if (objectivePressure >= thresholds.rollPressure && rollWins) {
    return { completed: true, usedFallback: true, rejectEarlyTarget: false };
  }

  return { completed: true, usedFallback: false, rejectEarlyTarget: false };
}
