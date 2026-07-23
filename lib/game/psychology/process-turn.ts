import { evaluateTurnWithPsychAi, type PsychJudgeOutput } from "@/lib/ai/psych-judge";
import { usageFromAttempt } from "@/lib/ai/openrouter";
import { generatePsychCharacterReplyWithAi } from "@/lib/ai/psych-character";
import { detectHollowFlattery } from "@/lib/game/flattery-triggers";
import { clamp, applyEmotionDelta, asEmotionState } from "@/lib/game/emotions";
import { LEVEL_STARTING_EMOTIONS } from "@/lib/game/level-emotions";
import { containsTargetPhrase, resolveObjectiveConfig, buildTargetUtteranceFallback } from "@/lib/game/objectives";
import { computeUtteranceReadiness } from "@/lib/game/utterance-readiness";
import { NEGATIVE_REPUTATION_INCIDENT_TAGS } from "@/lib/game/reputation-triggers";
import {
  defaultLocalNpcRelation,
  relationPatchAfterAttempt,
} from "@/lib/game/npc-relations";
import { computeStartBias } from "@/lib/game/reputation-lens";
import { applyHiddenAxisDelta, computeHiddenAxisDeltaFromContext, objectivePressureFromAxes } from "@/lib/game/psychology/axes";
import { applyRegulatedEmotionDelta, decayEmotionsTowardBaseline } from "@/lib/game/psychology/emotion-engine";
import { ensureBeliefs, updateBeliefs } from "@/lib/game/psychology/beliefs";
import { analyzeIdentityInteraction, detectMessageIntent } from "@/lib/game/psychology/identity";
import { computeCouncilVotes } from "@/lib/game/psychology/inner-council";
import { applyMemoryPatch } from "@/lib/game/psychology/memory";
import { evaluatePsychObjectiveCompletion } from "@/lib/game/psychology/objective-pressure";
import { objectiveThresholdsForLevel } from "@/lib/game/psychology/level-thresholds";
import { psychStateToJson, parsePsychState } from "@/lib/game/psychology/parse";
import { createInitialPsychState } from "@/lib/game/psychology/level-profiles";
import {
  decideResponseMode,
  forbiddenDirectReveal,
  mergeCouncilVotes,
  resolveFinalResponseMode,
} from "@/lib/game/psychology/response-mode";
import { emotionSpeechInstruction, responseModeInstruction } from "@/lib/game/character-speech";
import {
  voicePerformanceForResponse,
  type VoicePerformance,
} from "@/lib/game/voice-performance";
import { applyInterpretationLens } from "@/lib/game/reputation-lens";
import { mergeRedLinesIntoJudge } from "@/lib/game/psychology/merge-red-lines";
import { mockPsychJudgeForLevel } from "@/lib/game/psychology/mock-psych-judge";
import { evaluateObjectiveMet } from "@/lib/game/evaluate-objective-met";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import { detectLoreUse } from "@/lib/game/lore/detect-lore-use";
import { resolveUsesLore } from "@/lib/game/lore/lore-evaluation";
import { mockPsychCharacterMessage } from "@/lib/game/psychology/mock-psych-character";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import type { LocalNpcRelation } from "@/lib/game/npc-relations";
import type { PlayerReputation } from "@/lib/game/reputation";
import { responseModeRank, type PsychState } from "@/lib/game/psychology/types";
import type { Database, Json } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export interface PsychStartContext {
  psychState: PsychState;
  emotionBias: ReturnType<typeof computeStartBias>["emotionBias"];
  adjustedEmotions: ReturnType<typeof asEmotionState>;
  openingTone: string;
}

export function buildPsychStartContext(
  levelId: number,
  baseEmotions: Record<string, number>,
  reputation: PlayerReputation,
  localRelation: LocalNpcRelation,
  rumorLine?: string | null,
): PsychStartContext {
  const bias = computeStartBias(levelId, reputation, localRelation, rumorLine);
  const psychState = {
    ...createInitialPsychState(levelId),
    axes: applyHiddenAxisDelta(createInitialPsychState(levelId).axes, bias.psychAxesPatch),
    thresholdBias: bias.thresholdBias,
    lens: bias.lens,
    relationshipSummary: "",
  };
  const adjustedEmotions = applyEmotionDelta(asEmotionState(baseEmotions), bias.emotionBias);
  return {
    psychState,
    emotionBias: bias.emotionBias,
    adjustedEmotions,
    openingTone: bias.openingTone,
  };
}

function isSoftHelpQuestion(message: string, levelId: number): boolean {
  if (levelId !== 1) return false;
  return /jak nazywa|jak się nazywa|pomóż mi|pomoz mi|przypomn|zgadnij|jaka to|jaki to|nie pamiętam|zapomniałem|zapomnialem|litere|litera/i.test(
    message,
  );
}

function isPlayfulAssociation(message: string, directTarget: boolean): boolean {
  if (directTarget) return false;
  return /owoc|owocu|czerwon|zielon|słodk|slodk|zaczyna|litera|zgadnij|zapomnia|przypomn|nazwa.*j|na j|jak nazywa|jaki to|jaka to/i.test(
    message,
  );
}

export interface PsychTurnInput {
  level: GameLevelRow;
  attempt: AttemptRow;
  playerMessage: string;
  conversationContext: MessageRow[];
  recentPlayerMessages: string[];
  playerReputation: PlayerReputation;
  rumorLine?: string | null;
  innerMonologue: boolean;
  fallbackUsed: boolean;
  discoveredFragments?: string[];
  knownLore?: string[];
  locale: Locale;
}

export interface PsychTurnResult {
  effectiveJudge: PsychJudgeOutput;
  afterEmotion: ReturnType<typeof asEmotionState>;
  goalProgress: number;
  readiness: number;
  psychState: PsychState;
  responseMode: ReturnType<typeof decideResponseMode>;
  objectivePressure: number;
  characterMessage: string;
  characterNarration: string;
  characterVoicePerformance?: VoicePerformance;
  characterProvider: string;
  characterModel: string | null;
  completionResult: ReturnType<typeof evaluatePsychObjectiveCompletion>;
  localRelationPatch: ReturnType<typeof relationPatchAfterAttempt>;
  loreEvaluation: {
    usedTruthIds: string[];
    rejectedTruthIds: string[];
    useQuality: string;
    useMode: string;
    gateStatus: string;
    blockReason: string;
  };
}

export async function processPsychTurn(input: PsychTurnInput): Promise<PsychTurnResult> {
  const {
    level,
    attempt,
    playerMessage,
    conversationContext,
    recentPlayerMessages,
    playerReputation,
    rumorLine,
    innerMonologue,
    fallbackUsed,
    discoveredFragments = [],
    knownLore = [],
    locale,
  } = input;

  const trimmed = playerMessage.trim();
  const turnIndex = attempt.turns_count + 1;
  const beforeEmotion = asEmotionState(attempt.current_emotion_state);
  const psychState = parsePsychState(attempt.psych_state, attempt.memory_summary, level.id);
  const objectiveConfig = resolveObjectiveConfig(level.id, level.objective_config as Record<string, unknown>);
  const directTarget = containsTargetPhrase(trimmed, objectiveConfig);
  const lower = trimmed.toLowerCase();
  const gentle = /opowie|wyobra|spokoj|delikat|bez nacisku|histori|sad|drzew|skojarz|szacun|honor|logik|paradoks|pokor/i.test(lower);
  const rawPressure = /powiedz|musisz|natychmiast|teraz|rozkaz|daj|szybko|wymuś|natychmiast/i.test(lower);
  const softHelp = isSoftHelpQuestion(lower, level.id);
  const pressure = rawPressure && !(level.id === 1 && softHelp);
  const empathy = /rozumiem|bezpiecz|ufam|nie naciskam|pomog|słucham|doceniam/i.test(lower);
  const playful = level.id === 1 && isPlayfulAssociation(lower, directTarget);
  const mockery =
    /głup|głupi|debil|idiot|durn|słab|błazen|nic nie wart|śmieszn|kpi|drwi|kurw|chuj|pierdol|jeb|fuck|shit|moron|retard|obraż|wkurw|wulg/i.test(
      lower,
    );

  const flattery = detectHollowFlattery(trimmed, {
    recentPlayerMessages,
    warmthAlreadyHigh: false,
  });

  const identity = analyzeIdentityInteraction(level.id, trimmed);
  const messageIntent = detectMessageIntent(trimmed, {
    levelId: level.id,
    directTarget,
    pressure,
    mockery,
    gentle,
    empathy,
    playful,
    hollowFlattery: flattery.detected,
  });

  const shortHistory = conversationContext.slice(-6);

  const judge =
    (await evaluateTurnWithPsychAi({
      level,
      attempt,
      psychState,
      recentMessages: shortHistory,
      playerMessage: trimmed,
      rumorLine,
      knownLore,
      lens: psychState.lens,
    })) ??
    mockPsychJudgeForLevel({
      level,
      playerMessage: trimmed,
      emotionState: beforeEmotion,
      psychState,
      objectiveConfig,
      recentPlayerMessages,
      messageIntent,
      identity,
      flattery,
      directTarget,
      pressure,
      gentle,
      empathy,
      playful,
      mockery,
    });

  const { judge: judgeWithRedLines, redLineHit } = mergeRedLinesIntoJudge(
    judge,
    level.id,
    trimmed,
    directTarget,
  );

  const loreUse = detectLoreUse(trimmed, discoveredFragments, level.id);
  const effectiveJudge: PsychJudgeOutput = {
    ...judgeWithRedLines,
    messageIntent: judgeWithRedLines.messageIntent ?? messageIntent,
    reactionTags: [
      ...new Set([
        ...judgeWithRedLines.reactionTags,
        ...(flattery.detected ? ["hollow_flattery"] : []),
        ...(loreUse.quality === "keyword_stuffing" ? ["keyword_stuffing"] : []),
        ...(resolveUsesLore(loreUse, judgeWithRedLines.reactionTags) ? ["uses_previous_lore"] : []),
      ]),
    ],
  };

  const loreEvaluation = {
    usedTruthIds: effectiveJudge.reactionTags.includes("uses_previous_lore") ? loreUse.candidateFragments : [],
    rejectedTruthIds: effectiveJudge.reactionTags.includes("uses_previous_lore") ? [] : loreUse.candidateFragments,
    useQuality: loreUse.quality === "keyword_stuffing" ? "keyword_stuffing" : (effectiveJudge.reactionTags.includes("uses_previous_lore") ? "specific_and_relevant" : "none"),
    useMode: effectiveJudge.reactionTags.includes("weaponizes_lore") ? "weaponized" : "moral_evidence",
    gateStatus: "pending",
    blockReason: "",
  };

  const lens = psychState.lens ?? computeStartBias(level.id, playerReputation, defaultLocalNpcRelation(), rumorLine).lens;
  const lensAdjustedDelta = applyInterpretationLens(
    effectiveJudge.emotionDelta,
    lens,
    effectiveJudge.messageIntent,
  );

  const afterDelta = applyRegulatedEmotionDelta(beforeEmotion, lensAdjustedDelta);
  const emotionBaseline = asEmotionState(LEVEL_STARTING_EMOTIONS[level.id] ?? LEVEL_STARTING_EMOTIONS[1]!);
  const emotionDecay =
    redLineHit || mockery || pressure ? 0.03 : 0.06;
  const afterEmotion = decayEmotionsTowardBaseline(afterDelta, emotionBaseline, emotionDecay);

  const axisDeltaFromContext = computeHiddenAxisDeltaFromContext({
    levelId: level.id,
    messageIntent: effectiveJudge.messageIntent,
    reactionTags: effectiveJudge.reactionTags,
    hollowFlattery: flattery.detected,
    flatteryStreak: flattery.streak,
    identityAttack: identity.identityAttack,
    identityAffirmation: identity.identityAffirmation,
    topicRelevant: playful || gentle,
    directTarget,
  });

  const mergedAxisDelta = applyHiddenAxisDelta(psychState.axes, {
    ...effectiveJudge.hiddenAxisDelta,
    ...axisDeltaFromContext,
    identityDefense: (effectiveJudge.hiddenAxisDelta.identityDefense ?? 0) + identity.identityDefenseDelta,
  });

  let nextPsychState: PsychState = {
    ...psychState,
    axes: mergedAxisDelta,
    unconscious: {
      ...psychState.unconscious,
      doubt: clamp(
        psychState.unconscious.doubt +
          (effectiveJudge.unconsciousDelta?.doubt ?? 0) +
          (identity.identityAffirmation ? 4 : 0) +
          (identity.identityAttack ? -2 : 8),
        0,
        100,
      ),
      guilt: clamp(psychState.unconscious.guilt + (effectiveJudge.unconsciousDelta?.guilt ?? 0), 0, 100),
    },
    beliefs: updateBeliefs(ensureBeliefs(psychState, level.id), {
      messageIntent: effectiveJudge.messageIntent,
      identityAttack: identity.identityAttack,
      identityAffirmation: identity.identityAffirmation,
      concessionLikely: effectiveJudge.concessionLikely,
    }),
  };

  if (flattery.detected) {
    nextPsychState.axes.socialOpenness = clamp(nextPsychState.axes.socialOpenness - 4 * flattery.streak, 0, 100);
  }

  const serverCouncilVotes = computeCouncilVotes({
    levelId: level.id,
    messageIntent: effectiveJudge.messageIntent,
    reactionTags: effectiveJudge.reactionTags,
    hollowFlattery: flattery.detected,
    identityAttack: identity.identityAttack,
    identityAffirmation: identity.identityAffirmation,
    psychState: nextPsychState,
  });

  const promptResponseMode = decideResponseMode(level.id, nextPsychState, serverCouncilVotes);
  const objectivePressure = objectivePressureFromAxes(level.id, nextPsychState.axes);
  nextPsychState = {
    ...nextPsychState,
    responseMode: promptResponseMode,
    lastCouncilVotes: serverCouncilVotes,
    objectivePressure,
  };

  const goalProgress = clamp(
    Math.round(objectivePressure * 0.7 + nextPsychState.axes.socialOpenness * 0.3),
    0,
    100,
  );

  const readiness = computeUtteranceReadiness(level.id, afterEmotion, goalProgress, {
    pressureThisTurn: effectiveJudge.reactionTags.includes("direct_pressure"),
    hollowFlattery: effectiveJudge.reactionTags.includes("hollow_flattery"),
    flatteryStreak: flattery.detected ? flattery.streak : 0,
    redLineTags: effectiveJudge.reactionTags.filter((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag)),
  });

  const modeInstruction = [
    responseModeInstruction(level.id, level.character_config, promptResponseMode, objectivePressure),
    emotionSpeechInstruction(level.id, afterEmotion),
  ]
    .filter(Boolean)
    .join("\n");
  const completionRoll = Math.random() * 100;

  const characterOutput = await generatePsychCharacterReplyWithAi({
    level,
    attempt: {
      ...attempt,
      current_emotion_state: afterEmotion as Json,
      goal_progress: goalProgress,
      psych_state: psychStateToJson(nextPsychState),
    },
    recentMessages: [
      ...shortHistory,
      {
        id: "pending-user-message",
        attempt_id: attempt.id,
        user_id: attempt.user_id,
        level_id: attempt.level_id,
        role: "USER",
        turn_index: turnIndex,
        content: trimmed,
        emotion_state_before: beforeEmotion as Json,
        emotion_state_after: beforeEmotion as Json,
        judge_output: null,
        metadata: {},
        created_at: new Date().toISOString(),
      } satisfies MessageRow,
    ],
    judgeOutput: effectiveJudge,
    psychState: nextPsychState,
    responseMode: promptResponseMode,
    modeInstruction,
    reputation: playerReputation,
    innerMonologue,
    openingTone: psychState.lens?.openingTone ?? "",
    knownLore,
    locale,
  });

  let characterMessage =
    characterOutput?.message ??
    mockPsychCharacterMessage({
      level,
      responseMode: promptResponseMode,
      judge: effectiveJudge,
      objectivePressure,
      locale,
    });
  const characterNarration = characterOutput?.narration ?? "";

  const llmCouncilVotes =
    innerMonologue && characterOutput?.internalDebate?.length ? characterOutput.internalDebate : undefined;
  const finalResponseMode = resolveFinalResponseMode(
    level.id,
    nextPsychState,
    serverCouncilVotes,
    llmCouncilVotes,
  );
  nextPsychState = {
    ...nextPsychState,
    responseMode: finalResponseMode,
    lastCouncilVotes: llmCouncilVotes?.length
      ? mergeCouncilVotes(serverCouncilVotes, llmCouncilVotes)
      : serverCouncilVotes,
  };

  const skipCharacterObjectiveWin = isSageKeyGuessLevel(level.id, level.objective_type);
  
  let canComplete = true;
  let skipReason = "";

  if (skipCharacterObjectiveWin) {
    canComplete = false;
    skipReason = "Sage level completes via Record Stone location guess.";
  } else if (level.objective_type === "TARGET_UTTERANCE") {
    // TARGET_UTTERANCE does not use objectiveMetByJudge in evaluatePsychObjectiveCompletion.
    canComplete = false;
    skipReason = "Bypassed: TARGET_UTTERANCE objective type does not require AI judge validation.";
  } else if (
    level.objective_type === "SECRET_REVEAL" ||
    level.objective_type === "AGREEMENT" ||
    level.objective_type === "EMOTIONAL_UNLOCK"
  ) {
    const thresholds = objectiveThresholdsForLevel(level.id);
    const judgeConceded = effectiveJudge.concessionLikely;
    const playerReady = judgeConceded || objectivePressure >= thresholds.pressureMinimum;
    
    // SECRET_REVEAL and AGREEMENT also require modeReady (defensive_deflection or higher)
    const modeReady =
      level.objective_type === "EMOTIONAL_UNLOCK" ||
      responseModeRank(finalResponseMode) >= responseModeRank("defensive_deflection");

    if (!playerReady || !modeReady) {
      canComplete = false;
      skipReason = `Bypassed: Objective completion is mathematically impossible at this state (playerReady=${playerReady}, modeReady=${modeReady}).`;
    }
  }

  const objectiveMetResult = !canComplete
    ? {
        objectiveMet: false,
        confidence: 0,
        reason: skipReason,
        provider: "mock" as const,
        model: null,
      }
    : await evaluateObjectiveMet({
        level,
        recentMessages: shortHistory,
        playerMessage: trimmed,
        characterMessage,
        usageContext: usageFromAttempt(attempt, "objective"),
        locale,
      });

  let completionResult = evaluatePsychObjectiveCompletion({
    levelId: level.id,
    objectiveType: level.objective_type,
    objectiveConfig,
    characterConfig: level.character_config,
    characterMessage,
    objectivePressure,
    responseMode: finalResponseMode,
    judgeConceded: effectiveJudge.concessionLikely,
    objectiveMetByJudge: objectiveMetResult.objectiveMet,
    completionRoll,
    fallbackUsed,
    loreEvaluation,
  });

  if (completionResult.rejectEarlyTarget) {
    characterMessage = safeFallbackMessage(level.id, locale);
    completionResult = { completed: false, usedFallback: false, rejectEarlyTarget: true };
  } else if (completionResult.completed && completionResult.usedFallback) {
    if (level.objective_type === "TARGET_UTTERANCE") {
      characterMessage = buildTargetUtteranceFallback(level.id, level.character_name, objectiveConfig, locale);
    }
  }

  if (forbiddenDirectReveal(finalResponseMode) && containsTargetPhrase(characterMessage, objectiveConfig)) {
    characterMessage = safeFallbackMessage(level.id, locale);
    completionResult = { completed: false, usedFallback: false, rejectEarlyTarget: true };
  }

  nextPsychState = applyMemoryPatch(nextPsychState, turnIndex, effectiveJudge.memoryPatch);

  return {
    effectiveJudge,
    afterEmotion,
    goalProgress,
    readiness,
    psychState: nextPsychState,
    responseMode: finalResponseMode,
    objectivePressure,
    characterMessage,
    characterNarration,
    characterVoicePerformance: voicePerformanceForResponse(
      characterOutput?.voicePerformance,
      finalResponseMode,
    ),
    characterProvider: characterOutput?.provider ?? "mock",
    characterModel: characterOutput?.model ?? null,
    completionResult,
    localRelationPatch: relationPatchAfterAttempt(
      completionResult.completed,
      false,
      effectiveJudge.reactionTags.filter((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag)),
    ),
    loreEvaluation,
  };
}

function safeFallbackMessage(levelId: number, locale: Locale) {
  const { earlyTarget } = getDictionary(locale).content.fallbackDialogue;
  if (levelId === 1) {
    return earlyTarget.mila;
  }
  return earlyTarget.generic;
}

export { psychStateToJson, parsePsychState };
