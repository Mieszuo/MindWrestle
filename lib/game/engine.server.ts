import { handleRiskyActionPipeline } from "@/lib/game/risky-actions/engineIntegration";

import { createAttemptWithCredit } from "@/lib/billing/attempts.server";
import { maxUserMessagesPerAttempt } from "@/lib/billing/config";
import { generateCharacterReplyWithAi } from "@/lib/ai/character";
import { evaluateTurnWithAi, type JudgeOutput } from "@/lib/ai/judge";
import { localeFromProfileSettings, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import { usageFromAttempt } from "@/lib/ai/openrouter";
import { isInnerMonologueEnabled, isPsychEngineEnabled } from "@/lib/game/psychology/config";
import {
  buildPsychStartContext,
  processPsychTurn,
  psychStateToJson,
} from "@/lib/game/psychology/process-turn";
import { winStyleReputationDelta } from "@/lib/game/psychology/win-style-reputation";
import {
  getLocalNpcRelation,
  updateLocalNpcRelation,
} from "@/lib/game/npc-relations";
import { checkDefeat, type DefeatReason } from "@/lib/game/defeat";
import {
  resolveDefeatConfig,
  startingEmotionForAttempt,
} from "@/lib/game/defeat-thresholds";
import { applyEmotionDelta, asEmotionState, clamp } from "@/lib/game/emotions";
import { getConversationGreeting } from "@/lib/game/conversation-greetings";
import { scoreAttempt } from "@/lib/game/attempt-scoring";
import {
  buildTargetUtteranceFallback,
  evaluateObjectiveCompletion,
  resolveObjectiveConfig,
} from "@/lib/game/objectives";
import { detectHollowFlattery } from "@/lib/game/flattery-triggers";
import { evaluateObjectiveMet } from "@/lib/game/evaluate-objective-met";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import { fetchPlayerLoreState, unlockPlayerLoreBeat } from "@/lib/game/lore/persistence";
import { buildKnownLoreBullets, getLevelLore } from "@/lib/game/lore/chronicle-entries";
import { detectLoreUse } from "@/lib/game/lore/detect-lore-use";
import type { LoreBeatPayload } from "@/lib/game/lore/lore-beat-payload";
import { computeUtteranceReadiness } from "@/lib/game/utterance-readiness";
import { playerProgressFromRows } from "@/lib/game/progress";
import {
  accumulateSession,
  applyReputationToStartingEmotions,
  buildRumorLine,
  defaultReputationSession,
  parseReputationContext,
  parseReputationSession,
  reputationContextToJson,
  reputationSessionToJson,
  type PlayerReputation,
} from "@/lib/game/reputation";
import { NEGATIVE_REPUTATION_INCIDENT_TAGS } from "@/lib/game/reputation-triggers";
import { applyStartingEmotionPatch } from "@/lib/game/victory-thresholds";
import {
  authoredCompletionPerformance,
  type VoicePerformance,
} from "@/lib/game/voice-performance";
import type { EmotionState } from "@/lib/game/types";
import type { Json } from "@/lib/supabase/database.types";

import type { AttemptRow, Db, GameLevelRow, MessageRow } from "@/lib/game/engine/db-types";
import { getRankingPosition } from "@/lib/game/engine/ranking";
import {
  fetchAttemptMessages,
  toAttemptSnapshot,
  toPublicMessage,
} from "@/lib/game/engine/snapshot";
import {
  fetchUserNpcRelations,
  fetchUserReputation,
  flushAttemptReputation,
  persistUserNpcRelations,
} from "@/lib/game/engine/reputation-state";
import {
  mockCharacterMessage,
  mockJudgeForLevel,
  safeFallbackMessage,
} from "@/lib/game/engine/mock-judge";
import {
  completeProgressAndRanking,
  recordFailedAttempt,
} from "@/lib/game/engine/attempt-completion";
import { MAX_MESSAGE_LENGTH } from "@/lib/game/engine/constants";

export { getRanking } from "@/lib/game/engine/ranking";
export { submitSageKeyGuess } from "@/lib/game/engine/sage";
export { toAttemptSnapshot, toPublicMessage };

async function fetchUserLocale(supabase: Db, userId: string): Promise<Locale> {
  const { data } = await supabase.from("profiles").select("settings").eq("id", userId).maybeSingle();
  return localeFromProfileSettings(data?.settings) ?? "en";
}

export async function ensureUserProgress(supabase: Db, userId: string) {
  const { data: levels, error: levelsError } = await supabase
    .from("game_levels")
    .select("id, order_index")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (levelsError) throw new Error(levelsError.message);
  if (!levels?.length) return;

  const { data: existing, error: existingError } = await supabase
    .from("user_level_progress")
    .select("level_id")
    .eq("user_id", userId);

  if (existingError) throw new Error(existingError.message);

  const existingIds = new Set((existing ?? []).map((row) => row.level_id));
  const now = new Date().toISOString();
  const missing = levels
    .filter((level) => !existingIds.has(level.id))
    .map((level) => ({
      user_id: userId,
      level_id: level.id,
      status: level.order_index === 1 ? "CURRENT" : "LOCKED",
      unlocked_at: level.order_index === 1 ? now : null,
      updated_at: now,
    }));

  if (!missing.length) return;

  const { error } = await supabase.from("user_level_progress").insert(missing);
  if (error) throw new Error(error.message);
}

export async function getLevelsPayload(supabase: Db, userId: string) {
  await ensureUserProgress(supabase, userId);

  const [{ data: levels, error: levelsError }, { data: progress, error: progressError }, reputation] =
    await Promise.all([
      supabase.from("game_levels").select("*").eq("is_active", true).order("order_index", { ascending: true }),
      supabase
        .from("user_level_progress")
        .select(
          "level_id, status, attempts_count, completed_attempts_count, failed_attempts_count, best_attempt_id, best_time_ms, last_attempt_id, last_time_ms, last_status, unlocked_at, completed_at",
        )
        .eq("user_id", userId)
        .order("level_id", { ascending: true }),
      fetchUserReputation(supabase, userId),
    ]);

  if (levelsError) throw new Error(levelsError.message);
  if (progressError) throw new Error(progressError.message);

  return {
    levels: levels ?? [],
    progress: playerProgressFromRows(progress ?? []),
    reputation,
  };
}

export async function startAttempt(supabase: Db, userId: string, levelId: number) {
  await ensureUserProgress(supabase, userId);
  const locale = await fetchUserLocale(supabase, userId);

  const { data: progress, error: progressError } = await supabase
    .from("user_level_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", levelId)
    .single();

  if (progressError || !progress) throw new Error("Level progress not found");
  if (progress.status === "LOCKED") throw new Error("Level locked");

  const { data: level, error: levelError } = await supabase
    .from("game_levels")
    .select("*")
    .eq("id", levelId)
    .eq("is_active", true)
    .single();

  if (levelError || !level) throw new Error("Level not found");

  const { data: activeAttempt, error: activeAttemptError } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", levelId)
    .eq("status", "IN_PROGRESS")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAttemptError) throw new Error(activeAttemptError.message);
  if (activeAttempt) {
    return toAttemptSnapshot(activeAttempt, await fetchAttemptMessages(supabase, activeAttempt.id));
  }

  const reputation = await fetchUserReputation(supabase, userId);

  // Cleanup expired pending actions for this user
  await supabase
    .from("pending_actions")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString());

  const baseEmotions = applyStartingEmotionPatch(
    levelId,
    asEmotionState(level.starting_emotion_state),
  );

  let adjustedEmotions = baseEmotions;
  let adjustments: EmotionState = {};
  let psychStateJson: Json | null = null;

  if (isPsychEngineEnabled()) {
    const npcRelations = await fetchUserNpcRelations(supabase, userId);
    const localRelation = getLocalNpcRelation(npcRelations, levelId);
    const rumorLineForBias = buildRumorLine(reputation, level.order_index, levelId, locale);
    const psychStart = buildPsychStartContext(levelId, baseEmotions, reputation, localRelation, rumorLineForBias);
    adjustedEmotions = psychStart.adjustedEmotions;
    adjustments = psychStart.emotionBias;
    psychStateJson = psychStateToJson(psychStart.psychState);
  } else {
    const legacy = applyReputationToStartingEmotions(levelId, baseEmotions, reputation);
    adjustedEmotions = legacy.emotions;
    adjustments = legacy.adjustments;
  }

  const rumorLine = buildRumorLine(reputation, level.order_index, levelId, locale);
  const reputationContext = {
    rumorLine,
    emotionAdjustments: adjustments,
    renownEligible: progress.completed_attempts_count === 0,
  };

  const now = new Date().toISOString();

  // Credit consumption + attempt creation happen atomically in one RPC so a
  // failed insert can never burn a paid/free attempt (throws NoAttemptCreditsError
  // when the wallet is empty, which the start route maps to HTTP 402).
  const { attempt } = await createAttemptWithCredit(supabase, userId, {
    levelId,
    progressId: progress.id,
    emotionState: adjustedEmotions as Json,
    reputationSession: reputationSessionToJson(defaultReputationSession()),
    reputationContext: reputationContextToJson(reputationContext),
    psychState: psychStateJson,
    now,
  });

  const greeting = getConversationGreeting(levelId, reputation, locale);
  if (greeting) {
    const { error: greetingError } = await supabase.from("conversation_messages").insert({
      attempt_id: attempt.id,
      user_id: userId,
      level_id: levelId,
      role: "CHARACTER",
      turn_index: 0,
      content: greeting,
      metadata: { kind: "greeting" },
    });

    if (greetingError) throw new Error(greetingError.message);

    const { data: greetedAttempt, error: greetedAttemptError } = await supabase
      .from("conversation_attempts")
      .update({
        npc_messages_count: 1,
        updated_at: now,
      })
      .eq("id", attempt.id)
      .select("*")
      .single();

    if (greetedAttemptError || !greetedAttempt) {
      throw new Error(greetedAttemptError?.message ?? "Attempt greeting update failed");
    }

    const messages = await fetchAttemptMessages(supabase, attempt.id);
    return toAttemptSnapshot(greetedAttempt, messages);
  }

  return toAttemptSnapshot(attempt);
}

async function handlePsychAttemptMessage(
  supabase: Db,
  userId: string,
  attempt: AttemptRow,
  level: GameLevelRow,
  trimmed: string,
  locale: Locale,
) {
  const playerReputation = await fetchUserReputation(supabase, userId);
  const playerLore = await fetchPlayerLoreState(supabase, userId);
  const knownLore = buildKnownLoreBullets(playerLore.discoveredFragments, level.id);
  const turnIndex = attempt.turns_count + 1;
  const beforeEmotion = asEmotionState(attempt.current_emotion_state);

  const { data: recentMessages, error: recentMessagesError } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("attempt_id", attempt.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (recentMessagesError) throw new Error(recentMessagesError.message);
  const conversationContext = [...(recentMessages ?? [])].reverse();

  const reputationContext = parseReputationContext(attempt.reputation_context);
  const rumorLine =
    attempt.turns_count === 0 && level.order_index >= 3 ? (reputationContext?.rumorLine ?? null) : null;

  const sessionBefore = parseReputationSession(attempt.reputation_session);
  const recentPlayerMessages = conversationContext
    .filter((message) => message.role === "USER")
    .map((message) => message.content);

  const psychResult = await processPsychTurn({
    level,
    attempt,
    playerMessage: trimmed,
    conversationContext,
    recentPlayerMessages,
    playerReputation,
    rumorLine,
    innerMonologue: isInnerMonologueEnabled(),
    fallbackUsed: sessionBefore.completionFallbackUsed === true,
    discoveredFragments: playerLore.discoveredFragments,
    knownLore,
    locale,
  });

  const {
    effectiveJudge,
    afterEmotion,
    goalProgress,
    psychState,
    characterMessage: generatedCharacterMessage,
    characterNarration,
    characterVoicePerformance,
    characterProvider,
    characterModel,
    completionResult,
    localRelationPatch,
  } = psychResult;
  let characterMessage = generatedCharacterMessage;

  const completed = completionResult.completed;
  const defeatConfig = resolveDefeatConfig(
    level.id,
    startingEmotionForAttempt(
      level.id,
      attempt.reputation_context,
      asEmotionState(attempt.current_emotion_state),
    ),
    attempt.turns_count,
  );
  const defeatResult = checkDefeat(afterEmotion, defeatConfig, {
    reactionTags: effectiveJudge.reactionTags,
  });
  const defeated = !completed && defeatResult.defeated;
  const defeatReason: DefeatReason | null = defeated ? defeatResult.reason : null;

  const now = new Date();
  const nowIso = now.toISOString();
  const endedAt = completed || defeated ? nowIso : null;
  const durationMs =
    completed || defeated ? Math.max(0, now.getTime() - new Date(attempt.started_at).getTime()) : null;

  const nextReputationSession = accumulateSession(sessionBefore, effectiveJudge.reactionTags);
  if (completionResult.usedFallback) {
    nextReputationSession.completionFallbackUsed = true;
  }

  const winStyleDelta = winStyleReputationDelta(level.id, completed, {
    usedFallback: completionResult.usedFallback,
    sessionTags: nextReputationSession.tags,
    hollowFlattery: nextReputationSession.tags.includes("hollow_flattery"),
    turnsCount: turnIndex,
  });
  if (winStyleDelta) {
    for (const tag of winStyleDelta.tags) {
      if (!nextReputationSession.tags.includes(tag)) {
        nextReputationSession.tags.push(tag);
      }
    }
    nextReputationSession.respect += winStyleDelta.traits.respect ?? 0;
    nextReputationSession.warmth += winStyleDelta.traits.warmth ?? 0;
    nextReputationSession.pressure += winStyleDelta.traits.pressure ?? 0;
    nextReputationSession.cunning += winStyleDelta.traits.cunning ?? 0;
    nextReputationSession.arrogance += winStyleDelta.traits.arrogance ?? 0;
  }

  const npcRelations = await fetchUserNpcRelations(supabase, userId);
  const updatedRelations = updateLocalNpcRelation(npcRelations, level.id, {
    ...localRelationPatch,
    resentment: defeated
      ? (getLocalNpcRelation(npcRelations, level.id).resentment + 12)
      : localRelationPatch.resentment,
    lastOutcome: defeated ? "failed" : completed ? "won" : getLocalNpcRelation(npcRelations, level.id).lastOutcome,
  });
  await persistUserNpcRelations(supabase, userId, updatedRelations);

  const characterMetadata: Record<string, unknown> = {
    judgeProvider: effectiveJudge.provider,
    judgeModel: effectiveJudge.model ?? null,
    characterProvider,
    characterModel,
    narration: characterNarration,
    psychEngine: true,
    responseMode: psychResult.responseMode,
    objectivePressure: psychResult.objectivePressure,
    voicePerformance: characterVoicePerformance,
    loreEvaluation: psychResult.loreEvaluation,
  };

  if (completionResult.blockReason === "INSUFFICIENT_LORE_EVIDENCE") {
    const feedback = getDictionary(locale).content.loreGateNarration;
    characterMetadata.narration = characterNarration ? `${characterNarration} ${feedback}` : feedback;
  }

  if (isInnerMonologueEnabled() && psychState.lastCouncilVotes.length) {
    characterMetadata.internalDebate = psychState.lastCouncilVotes;
  }

  if (completed) {
    characterMessage = getLevelLore(level.id, locale)?.completionReveal ?? characterMessage;
    characterMetadata.narration = "";
    characterMetadata.voicePerformance = authoredCompletionPerformance(level.id);
  }

  const { error: messagesError } = await supabase
    .from("conversation_messages")
    .insert([
      {
        attempt_id: attempt.id,
        user_id: userId,
        level_id: attempt.level_id,
        role: "USER",
        turn_index: turnIndex,
        content: trimmed,
        emotion_state_before: beforeEmotion as Json,
        emotion_state_after: beforeEmotion as Json,
        metadata: {},
      },
      {
        attempt_id: attempt.id,
        user_id: userId,
        level_id: attempt.level_id,
        role: "CHARACTER",
        turn_index: turnIndex,
        content: characterMessage,
        emotion_state_before: beforeEmotion as Json,
        emotion_state_after: afterEmotion as Json,
        judge_output: effectiveJudge as unknown as Json,
        metadata: characterMetadata as Json,
      },
    ])
    .select("*");

  if (messagesError) throw new Error(messagesError.message);

  const { data: updatedAttempt, error: updateError } = await supabase
    .from("conversation_attempts")
    .update({
      status: completed ? "COMPLETED" : defeated ? "FAILED" : "IN_PROGRESS",
      failure_reason: defeated ? "EMOTION_BREAK" : null,
      ended_at: endedAt,
      duration_ms: durationMs,
      turns_count: turnIndex,
      user_messages_count: attempt.user_messages_count + 1,
      npc_messages_count: attempt.npc_messages_count + 1,
      current_emotion_state: afterEmotion as Json,
      goal_progress: goalProgress,
      memory_summary: psychState.relationshipSummary,
      psych_state: psychStateToJson(psychState),
      completed_by: completed ? (level.objective_type === "TARGET_UTTERANCE" ? "TARGET_PHRASE" : "JUDGE_DECISION") : null,
      last_activity_at: nowIso,
      ai_model_judge: effectiveJudge.model ?? null,
      ai_model_character: characterModel,
      reputation_session: reputationSessionToJson(nextReputationSession),
      updated_at: nowIso,
    })
    .eq("id", attempt.id)
    .select("*")
    .single();

  if (updateError || !updatedAttempt) throw new Error(updateError?.message ?? "Attempt update failed");

  let rankingPosition: number | null = null;
  let isNewPersonalBest = false;
  let reputation: PlayerReputation | undefined;
  let reputationDelta: { renown: number } | undefined;
  let loreBeat: LoreBeatPayload | null = null;

  if (completed && durationMs !== null) {
    const { data: levelProgress } = await supabase
      .from("user_level_progress")
      .select("completed_attempts_count")
      .eq("user_id", userId)
      .eq("level_id", level.id)
      .maybeSingle();
    const isFirstCompletion = (levelProgress?.completed_attempts_count ?? 0) === 0;

    loreBeat = await unlockPlayerLoreBeat(supabase, userId, level.id, isFirstCompletion, nowIso, locale);
    const result = await completeProgressAndRanking(supabase, userId, updatedAttempt, durationMs, nowIso);
    rankingPosition = result.rankingPosition;
    isNewPersonalBest = result.isNewPersonalBest;
    const repResult = await flushAttemptReputation(supabase, userId, updatedAttempt, level, "COMPLETED", {
      firstCompletion: isFirstCompletion,
    });
    reputation = repResult.reputation;
    reputationDelta = { renown: repResult.renownDelta };
  } else if (defeated && durationMs !== null) {
    await recordFailedAttempt(supabase, userId, updatedAttempt, durationMs, nowIso);
    const repResult = await flushAttemptReputation(supabase, userId, updatedAttempt, level, "EMOTION_BREAK");
    reputation = repResult.reputation;
    reputationDelta = { renown: repResult.renownDelta };
  }

  return {
    attempt: toAttemptSnapshot(updatedAttempt, await fetchAttemptMessages(supabase, attempt.id)),
    characterMessage,
    completed,
    defeated,
    failureReason: defeated ? "EMOTION_BREAK" : undefined,
    defeatReason,
    durationMs,
    rankingPosition,
    isNewPersonalBest,
    emotionDelta: effectiveJudge.emotionDelta,
    reactionTags: effectiveJudge.reactionTags,
    responseMode: psychResult.responseMode,
    voicePerformance: characterMetadata.voicePerformance as VoicePerformance | undefined,
    attemptScore:
      completed && durationMs !== null
        ? scoreAttempt({
            durationMs,
            turnsCount: turnIndex,
            session: nextReputationSession,
            rankingPosition: rankingPosition ?? null,
            locale,
          })
        : undefined,
    reputation,
    reputationDelta,
    loreBeat,
  };
}

async function finishAttemptByTurnLimit(supabase: Db, userId: string, attempt: AttemptRow) {
  const now = new Date();
  const nowIso = now.toISOString();
  const durationMs = Math.max(0, now.getTime() - new Date(attempt.started_at).getTime());
  const turnIndex = attempt.turns_count + 1;
  const locale = await fetchUserLocale(supabase, userId);
  const message = getDictionary(locale).content.turnLimitMessage;

  const { error: messageError } = await supabase.from("conversation_messages").insert({
    attempt_id: attempt.id,
    user_id: userId,
    level_id: attempt.level_id,
    role: "CHARACTER",
    turn_index: turnIndex,
    content: message,
    emotion_state_before: attempt.current_emotion_state,
    emotion_state_after: attempt.current_emotion_state,
    metadata: { kind: "turn_limit" },
  });
  if (messageError) throw new Error(messageError.message);

  const { data: updatedAttempt, error: updateError } = await supabase
    .from("conversation_attempts")
    .update({
      status: "FAILED",
      failure_reason: "TURN_LIMIT_REACHED",
      ended_at: nowIso,
      duration_ms: durationMs,
      npc_messages_count: attempt.npc_messages_count + 1,
      last_activity_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", attempt.id)
    .select("*")
    .single();

  if (updateError || !updatedAttempt) throw new Error(updateError?.message ?? "Attempt update failed");

  await recordFailedAttempt(supabase, userId, updatedAttempt, durationMs, nowIso);

  return {
    attempt: toAttemptSnapshot(updatedAttempt, await fetchAttemptMessages(supabase, attempt.id)),
    characterMessage: message,
    completed: false,
    defeated: true,
    failureReason: "TURN_LIMIT_REACHED",
    durationMs,
    rankingPosition: null,
    isNewPersonalBest: false,
    emotionDelta: {},
    reactionTags: ["turn_limit"],
  };
}

export async function sendAttemptMessage(supabase: Db, userId: string, attemptId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("content is required");
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Pergamin nie mieści tak długiego argumentu. Skróć wiadomość do ${MAX_MESSAGE_LENGTH} znaków.`);
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (attemptError || !attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt is not in progress");

  if (attempt.user_messages_count >= maxUserMessagesPerAttempt()) {
    return finishAttemptByTurnLimit(supabase, userId, attempt);
  }

  const { data: level, error: levelError } = await supabase
    .from("game_levels")
    .select("*")
    .eq("id", attempt.level_id)
    .single();

  if (levelError || !level) throw new Error("Level not found");
  const locale = await fetchUserLocale(supabase, userId);

  // --- RISKY ACTIONS PIPELINE ---
  const riskyPipeline = await handleRiskyActionPipeline(
    supabase,
    userId,
    level.id,
    level.character_name,
    attempt.id,
    trimmed,
    attempt.turns_count,
    locale,
  );

  if (riskyPipeline.requiresConfirmation) {
    return {
      status: "REQUIRES_ACTION_CONFIRMATION",
      pendingActionId: riskyPipeline.pendingActionId,
      warning: riskyPipeline.warning,
      actionTitle: riskyPipeline.actionTitle,
      difficulty: riskyPipeline.difficulty,
    };
  }

  if (riskyPipeline.rejectionReason) {
    return {
      status: "ACTION_REJECTED",
      rejectionReason: riskyPipeline.rejectionReason,
    };
  }
  // --- END RISKY ACTIONS PIPELINE ---

  if (isPsychEngineEnabled()) {
    return handlePsychAttemptMessage(supabase, userId, attempt, level, trimmed, locale);
  }

  const playerReputation = await fetchUserReputation(supabase, userId);
  const playerLore = await fetchPlayerLoreState(supabase, userId);
  const knownLore = buildKnownLoreBullets(playerLore.discoveredFragments, level.id);
  const turnIndex = attempt.turns_count + 1;
  const beforeEmotion = asEmotionState(attempt.current_emotion_state);
  const objectiveConfig = resolveObjectiveConfig(level.id, level.objective_config as Record<string, unknown>);
  const { data: recentMessages, error: recentMessagesError } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("attempt_id", attempt.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (recentMessagesError) throw new Error(recentMessagesError.message);
  const conversationContext = [...(recentMessages ?? [])].reverse();

  const reputationContext = parseReputationContext(attempt.reputation_context);
  const rumorLine =
    attempt.turns_count === 0 && level.order_index >= 3 ? (reputationContext?.rumorLine ?? null) : null;

  const sessionBefore = parseReputationSession(attempt.reputation_session);
  const recentPlayerMessages = conversationContext
    .filter((message) => message.role === "USER")
    .map((message) => message.content);

  const judge =
    (await evaluateTurnWithAi({
      level,
      attempt,
      recentMessages: conversationContext,
      playerMessage: trimmed,
      rumorLine,
      knownLore,
    })) ??
    mockJudgeForLevel({
      playerMessage: trimmed,
      emotionState: beforeEmotion,
      goalProgress: attempt.goal_progress,
      objectiveConfig,
      level,
      recentPlayerMessages,
      sessionWarmth: sessionBefore.warmth,
    });

  const flattery = detectHollowFlattery(trimmed, {
    recentPlayerMessages,
    warmthAlreadyHigh: sessionBefore.warmth > 4,
  });

  const loreUse = detectLoreUse(trimmed, playerLore.discoveredFragments, level.id);
  const effectiveJudge: JudgeOutput = {
    ...judge,
    goalProgressDelta: judge.goalProgressDelta,
    reactionTags: [
      ...new Set([
        ...judge.reactionTags,
        ...(flattery.detected ? ["hollow_flattery"] : []),
        ...(loreUse.quality === "keyword_stuffing" ? ["keyword_stuffing"] : []),
      ]),
    ],
  };

  const afterEmotion = applyEmotionDelta(beforeEmotion, effectiveJudge.emotionDelta);
  const goalProgress = clamp(attempt.goal_progress + effectiveJudge.goalProgressDelta, 0, 100);

  const readiness = computeUtteranceReadiness(level.id, afterEmotion, goalProgress, {
    pressureThisTurn: effectiveJudge.reactionTags.includes("direct_pressure"),
    hollowFlattery: effectiveJudge.reactionTags.includes("hollow_flattery"),
    flatteryStreak: flattery.detected ? flattery.streak : 0,
    redLineTags: effectiveJudge.reactionTags.filter((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag)),
  });

  const completionRoll = Math.random() * 100;

  const characterOutput = await generateCharacterReplyWithAi({
    level,
    attempt: { ...attempt, current_emotion_state: afterEmotion as Json, goal_progress: goalProgress },
    recentMessages: [
      ...conversationContext,
      {
        id: "pending-user-message",
        attempt_id: attempt.id,
        user_id: userId,
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
    readiness,
    reputation: playerReputation,
    knownLore,
    locale,
  });

  let characterMessage = characterOutput?.message ?? mockCharacterMessage(effectiveJudge, level, readiness, locale);

  const skipCharacterObjectiveWin = isSageKeyGuessLevel(level.id, level.objective_type);

  let canComplete = true;
  let skipReason = "";

  if (skipCharacterObjectiveWin) {
    canComplete = false;
    skipReason = "Sage level completes via Record Stone location guess.";
  } else if (level.objective_type === "TARGET_UTTERANCE") {
    // TARGET_UTTERANCE does not use objectiveMetByJudge in evaluateObjectiveCompletion.
    canComplete = false;
    skipReason = "Bypassed: TARGET_UTTERANCE objective type does not require AI judge validation.";
  } else {
    // Other types in legacy flow require judgeConceded AND readiness >= 38
    const judgeConceded = effectiveJudge.concessionLikely;
    if (!judgeConceded && readiness < 38) {
      canComplete = false;
      skipReason = `Bypassed: Objective completion is mathematically impossible at this state (concessionLikely=${judgeConceded}, readiness=${readiness}).`;
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
        recentMessages: conversationContext,
        playerMessage: trimmed,
        characterMessage,
        usageContext: usageFromAttempt(attempt, "objective"),
        locale,
      });

  const completionResult = evaluateObjectiveCompletion({
    objectiveType: level.objective_type,
    objectiveConfig,
    characterMessage,
    readiness,
    judgeConceded: effectiveJudge.concessionLikely,
    objectiveMetByJudge: objectiveMetResult.objectiveMet,
    completionRoll,
    fallbackUsed: sessionBefore.completionFallbackUsed === true,
  });

  if (completionResult.rejectEarlyTarget) {
    characterMessage = safeFallbackMessage(level.id, locale);
  } else if (completionResult.completed && completionResult.usedFallback) {
    if (level.objective_type === "TARGET_UTTERANCE") {
      characterMessage = buildTargetUtteranceFallback(level.id, level.character_name, objectiveConfig, locale);
    }
  }

  const completed = completionResult.completed;

  if (completed) {
    characterMessage = getLevelLore(level.id, locale)?.completionReveal ?? characterMessage;
  }

  const defeatConfig = resolveDefeatConfig(
    level.id,
    startingEmotionForAttempt(
      level.id,
      attempt.reputation_context,
      asEmotionState(attempt.current_emotion_state),
    ),
    attempt.turns_count,
  );
  const defeatResult = checkDefeat(afterEmotion, defeatConfig, {
    reactionTags: effectiveJudge.reactionTags,
  });
  const defeated = !completed && defeatResult.defeated;
  const defeatReason: DefeatReason | null = defeated ? defeatResult.reason : null;

  const now = new Date();
  const nowIso = now.toISOString();
  const endedAt = completed || defeated ? nowIso : null;
  const durationMs =
    completed || defeated ? Math.max(0, now.getTime() - new Date(attempt.started_at).getTime()) : null;

  const nextReputationSession = accumulateSession(sessionBefore, effectiveJudge.reactionTags);
  nextReputationSession.flatteryStreak = flattery.detected ? flattery.streak : 0;
  if (completionResult.usedFallback) {
    nextReputationSession.completionFallbackUsed = true;
  }

  const { error: messagesError } = await supabase
    .from("conversation_messages")
    .insert([
      {
        attempt_id: attempt.id,
        user_id: userId,
        level_id: attempt.level_id,
        role: "USER",
        turn_index: turnIndex,
        content: trimmed,
        emotion_state_before: beforeEmotion as Json,
        emotion_state_after: beforeEmotion as Json,
        metadata: {},
      },
      {
        attempt_id: attempt.id,
        user_id: userId,
        level_id: attempt.level_id,
        role: "CHARACTER",
        turn_index: turnIndex,
        content: characterMessage,
        emotion_state_before: beforeEmotion as Json,
        emotion_state_after: afterEmotion as Json,
        judge_output: effectiveJudge as unknown as Json,
        metadata: {
          judgeProvider: effectiveJudge.provider,
          judgeModel: effectiveJudge.model ?? null,
          characterProvider: characterOutput?.provider ?? "mock",
          characterModel: characterOutput?.model ?? null,
          narration: completed ? "" : characterOutput?.narration ?? "",
          voicePerformance: completed
            ? (authoredCompletionPerformance(level.id) as unknown as Json)
            : null,
        },
      },
    ])
    .select("*");

  if (messagesError) throw new Error(messagesError.message);

  const { data: updatedAttempt, error: updateError } = await supabase
    .from("conversation_attempts")
    .update({
      status: completed ? "COMPLETED" : defeated ? "FAILED" : "IN_PROGRESS",
      failure_reason: defeated ? "EMOTION_BREAK" : null,
      ended_at: endedAt,
      duration_ms: durationMs,
      turns_count: turnIndex,
      user_messages_count: attempt.user_messages_count + 1,
      npc_messages_count: attempt.npc_messages_count + 1,
      current_emotion_state: afterEmotion as Json,
      goal_progress: goalProgress,
      memory_summary: effectiveJudge.memoryPatch,
      completed_by: completed ? (level.objective_type === "TARGET_UTTERANCE" ? "TARGET_PHRASE" : "JUDGE_DECISION") : null,
      last_activity_at: nowIso,
      ai_model_judge: effectiveJudge.model ?? null,
      ai_model_character: characterOutput?.model ?? null,
      reputation_session: reputationSessionToJson(nextReputationSession),
      updated_at: nowIso,
    })
    .eq("id", attempt.id)
    .select("*")
    .single();

  if (updateError || !updatedAttempt) throw new Error(updateError?.message ?? "Attempt update failed");

  let rankingPosition: number | null = null;
  let isNewPersonalBest = false;
  let reputation: PlayerReputation | undefined;
  let reputationDelta: { renown: number } | undefined;
  let loreBeat: LoreBeatPayload | null = null;

  if (completed && durationMs !== null) {
    const { data: levelProgress } = await supabase
      .from("user_level_progress")
      .select("completed_attempts_count")
      .eq("user_id", userId)
      .eq("level_id", level.id)
      .maybeSingle();
    const isFirstCompletion = (levelProgress?.completed_attempts_count ?? 0) === 0;

    loreBeat = await unlockPlayerLoreBeat(supabase, userId, level.id, isFirstCompletion, nowIso, locale);
    const result = await completeProgressAndRanking(supabase, userId, updatedAttempt, durationMs, nowIso);
    rankingPosition = result.rankingPosition;
    isNewPersonalBest = result.isNewPersonalBest;
    const repResult = await flushAttemptReputation(supabase, userId, updatedAttempt, level, "COMPLETED", {
      firstCompletion: isFirstCompletion,
    });
    reputation = repResult.reputation;
    reputationDelta = { renown: repResult.renownDelta };
  } else if (defeated && durationMs !== null) {
    await recordFailedAttempt(supabase, userId, updatedAttempt, durationMs, nowIso);
    const repResult = await flushAttemptReputation(supabase, userId, updatedAttempt, level, "EMOTION_BREAK");
    reputation = repResult.reputation;
    reputationDelta = { renown: repResult.renownDelta };
  }

  return {
    attempt: toAttemptSnapshot(updatedAttempt, await fetchAttemptMessages(supabase, attempt.id)),
    characterMessage,
    completed,
    defeated,
    failureReason: defeated ? "EMOTION_BREAK" : undefined,
    defeatReason,
    durationMs,
    rankingPosition,
    isNewPersonalBest,
    emotionDelta: effectiveJudge.emotionDelta,
    reactionTags: effectiveJudge.reactionTags,
    attemptScore:
      completed && durationMs !== null
        ? scoreAttempt({
            durationMs,
            turnsCount: turnIndex,
            session: nextReputationSession,
            rankingPosition: rankingPosition ?? null,
            locale,
          })
        : undefined,
    reputation,
    reputationDelta,
    loreBeat,
    voicePerformance: completed ? authoredCompletionPerformance(level.id) : undefined,
  };
}

export async function forfeitAttempt(supabase: Db, userId: string, attemptId: string) {
  const { data: attempt, error } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (error || !attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") return toAttemptSnapshot(attempt);

  const { data: level } = await supabase
    .from("game_levels")
    .select("*")
    .eq("id", attempt.level_id)
    .single();

  const now = new Date();
  const durationMs = Math.max(0, now.getTime() - new Date(attempt.started_at).getTime());
  const nowIso = now.toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("conversation_attempts")
    .update({
      status: "FAILED",
      failure_reason: "USER_EXITED",
      ended_at: nowIso,
      duration_ms: durationMs,
      last_activity_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", attemptId)
    .select("*")
    .single();

  if (updateError || !updated) throw new Error(updateError?.message ?? "Forfeit failed");

  if (level) {
    await flushAttemptReputation(supabase, userId, updated, level, "USER_EXITED");
  }

  const { data: progress } = await supabase
    .from("user_level_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", attempt.level_id)
    .single();

  if (progress) {
    await (supabase.rpc as any)("increment_level_progress_counter", {
      p_user_id: userId,
      p_level_id: attempt.level_id,
      p_column: "failed_attempts_count",
    });

    await supabase
      .from("user_level_progress")
      .update({
        last_attempt_id: attemptId,
        last_time_ms: durationMs,
        last_status: "FAILED",
        updated_at: nowIso,
      })
      .eq("id", progress.id);
  }

  return toAttemptSnapshot(updated);
}

export async function heartbeatAttempt(supabase: Db, userId: string, attemptId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversation_attempts")
    .update({ last_activity_at: now, updated_at: now })
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("status", "IN_PROGRESS")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toAttemptSnapshot(data) : null;
}

export async function getAttemptReplay(supabase: Db, userId: string, attemptId: string) {
  const { data: attempt, error: attemptError } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (attemptError || !attempt) throw new Error("Attempt not found");

  const [{ data: level, error: levelError }, messages] = await Promise.all([
    supabase.from("game_levels").select("*").eq("id", attempt.level_id).single(),
    fetchAttemptMessages(supabase, attemptId),
  ]);

  if (levelError || !level) throw new Error("Level not found");

  const locale = await fetchUserLocale(supabase, userId);
  const session = parseReputationSession(attempt.reputation_session);
  const score =
    attempt.status === "COMPLETED" && attempt.duration_ms != null
      ? scoreAttempt({
          durationMs: attempt.duration_ms,
          turnsCount: attempt.turns_count,
          session,
          rankingPosition: await getRankingPosition(supabase, userId, attempt.level_id),
          locale,
        })
      : null;

  return {
    attempt: toAttemptSnapshot(attempt, messages),
    level: {
      id: level.id,
      slug: level.slug,
      characterName: level.character_name,
      archetype: level.archetype,
    },
    score,
  };
}
