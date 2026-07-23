import { usageFromAttempt } from "@/lib/ai/openrouter";
import { scoreAttempt } from "@/lib/game/attempt-scoring";
import { checkDefeat } from "@/lib/game/defeat";
import { resolveDefeatConfig } from "@/lib/game/defeat-thresholds";
import { applyEmotionDelta, asEmotionState } from "@/lib/game/emotions";
import { evaluateSageKeyGuess } from "@/lib/game/evaluate-sage-key-guess";
import { getLevelLore } from "@/lib/game/lore/chronicle-entries";
import type { LoreBeatPayload } from "@/lib/game/lore/lore-beat-payload";
import { unlockPlayerLoreBeat } from "@/lib/game/lore/persistence";
import { parseReputationSession, type PlayerReputation } from "@/lib/game/reputation";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import { localeFromProfileSettings } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import type { Json } from "@/lib/supabase/database.types";

import { MAX_MESSAGE_LENGTH } from "./constants";
import { completeProgressAndRanking, recordFailedAttempt } from "./attempt-completion";
import type { Db } from "./db-types";
import { flushAttemptReputation } from "./reputation-state";
import { fetchAttemptMessages, toAttemptSnapshot } from "./snapshot";

export async function submitSageKeyGuess(supabase: Db, userId: string, attemptId: string, guess: string) {
  const trimmed = guess.trim();
  if (!trimmed) throw new Error("guess is required");

  const { data: sageProfile } = await supabase.from("profiles").select("settings").eq("id", userId).maybeSingle();
  const sageLocale = localeFromProfileSettings(sageProfile?.settings) ?? "en";
  const sageCopy = getDictionary(sageLocale).content.sage;

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(sageCopy.guessTooLong(MAX_MESSAGE_LENGTH));
  }

  const { data: attemptRow, error: fetchError } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !attemptRow) throw new Error("Attempt not found");
  if (attemptRow.status !== "IN_PROGRESS") throw new Error("Attempt is not in progress");

  const { data: level, error: levelError } = await supabase
    .from("game_levels")
    .select("*")
    .eq("id", attemptRow.level_id)
    .single();

  if (levelError || !level) throw new Error("Level not found");
  if (!isSageKeyGuessLevel(level.id, level.objective_type)) {
    throw new Error("Record Stone location guess is only available on the sage level");
  }

  const messages = await fetchAttemptMessages(supabase, attemptId);
  const hasCharacterReply = messages.some((message) => message.role === "CHARACTER");
  if (!hasCharacterReply) {
    throw new Error(sageCopy.waitForReply);
  }

  const evaluation = await evaluateSageKeyGuess({
    level,
    recentMessages: messages,
    playerGuess: trimmed,
    usageContext: usageFromAttempt(attemptRow, "sage_key_guess"),
  });

  const sessionBefore = parseReputationSession(attemptRow.reputation_session);
  const attemptMeta = (attemptRow as Record<string, unknown>);
  const wrongGuessCount = (attemptMeta.metadata as Record<string, unknown> | null)?.wrongKeyGuessCount as number || 0;
  const now = new Date();
  const nowIso = now.toISOString();
  const completed = evaluation.correct;
  const endedAt = completed ? nowIso : null;
  const durationMs = completed
    ? Math.max(0, now.getTime() - new Date(attemptRow.started_at).getTime())
    : null;

  const newWrongCount = completed ? wrongGuessCount : wrongGuessCount + 1;
  const tooManyWrong = newWrongCount >= 5;
  const turnIndex = attemptRow.turns_count + 1;

  // Apply emotion penalty on wrong guess
  const beforeEmotion = asEmotionState(attemptRow.current_emotion_state);
  let afterEmotion = beforeEmotion;
  if (!completed) {
    const wrongPenalty: Record<string, number> = {
      patience: -8,
      curiosity: -4,
    };
    afterEmotion = applyEmotionDelta(beforeEmotion, wrongPenalty);
  }

  // Check defeat on wrong guesses
  let defeated = false;
  let defeatResult: ReturnType<typeof checkDefeat> | null = null;
  if (!completed && tooManyWrong) {
    defeated = true;
    defeatResult = {
      defeated: true,
      reason: {
        emotion: "patience",
        op: "lte" as const,
        threshold: 0,
        currentValue: afterEmotion.patience ?? 0,
      },
    };
  } else if (!completed) {
    const defeatConfigLocal = resolveDefeatConfig(level.id, beforeEmotion, turnIndex);
    const check = checkDefeat(afterEmotion, defeatConfigLocal, { reactionTags: [] });
    if (check.defeated) {
      defeated = true;
      defeatResult = check;
    }
  }

  const sageCompletionReveal = completed ? getLevelLore(level.id, sageLocale)?.completionReveal ?? null : null;
  const messagesToInsert = [
    {
      attempt_id: attemptRow.id,
      user_id: userId,
      level_id: attemptRow.level_id,
      role: "SYSTEM_EVENT",
      turn_index: turnIndex,
      content: trimmed,
      emotion_state_before: beforeEmotion as Json,
      emotion_state_after: afterEmotion as Json,
      judge_output: null,
      metadata: {
        keyGuess: true,
        correct: evaluation.correct,
        judgeProvider: evaluation.provider,
        judgeReason: evaluation.reason,
      } as Json,
    },
    ...(sageCompletionReveal
      ? [
          {
            attempt_id: attemptRow.id,
            user_id: userId,
            level_id: attemptRow.level_id,
            role: "CHARACTER",
            turn_index: attemptRow.turns_count,
            content: sageCompletionReveal,
            emotion_state_before: attemptRow.current_emotion_state as Json,
            emotion_state_after: attemptRow.current_emotion_state as Json,
            judge_output: null,
            metadata: { kind: "completion_reveal" } as Json,
          },
        ]
      : []),
  ];
  const { error: insertError } = await supabase.from("conversation_messages").insert(messagesToInsert);

  if (insertError) throw new Error(insertError.message);

  const attemptStatus = completed ? "COMPLETED" : defeated ? "FAILED" : "IN_PROGRESS";

  const { data: updatedAttempt, error: updateError } = await (supabase as any)
    .from("conversation_attempts")
    .update({
      status: attemptStatus,
      ended_at: defeated && !completed ? nowIso : endedAt,
      duration_ms: defeated && !completed
        ? Math.max(0, now.getTime() - new Date(attemptRow.started_at).getTime())
        : durationMs,
      failure_reason: defeated && !completed ? "KEY_GUESS_LIMIT" : attemptRow.failure_reason,
      completed_by: completed ? "KEY_GUESS" : null,
      turns_count: attemptRow.turns_count + 1,
      user_messages_count: attemptRow.user_messages_count + 1,
      current_emotion_state: afterEmotion,
      npc_messages_count: attemptRow.npc_messages_count + (sageCompletionReveal ? 1 : 0),
      metadata: { wrongKeyGuessCount: newWrongCount },
      last_activity_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", attemptRow.id)
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

    loreBeat = await unlockPlayerLoreBeat(supabase, userId, level.id, isFirstCompletion, nowIso, sageLocale);
    const result = await completeProgressAndRanking(supabase, userId, updatedAttempt, durationMs, nowIso);
    rankingPosition = result.rankingPosition;
    isNewPersonalBest = result.isNewPersonalBest;
    const repResult = await flushAttemptReputation(supabase, userId, updatedAttempt, level, "COMPLETED", {
      firstCompletion: isFirstCompletion,
    });
    reputation = repResult.reputation;
    reputationDelta = { renown: repResult.renownDelta };
  }

  if (defeated) {
    const failedDurationMs = Math.max(0, now.getTime() - new Date(attemptRow.started_at).getTime());
    await recordFailedAttempt(supabase, userId, updatedAttempt, failedDurationMs, nowIso);
  }

  return {
    attempt: toAttemptSnapshot(updatedAttempt, await fetchAttemptMessages(supabase, attemptId)),
    correct: evaluation.correct,
    feedback: evaluation.correct
      ? undefined
      : tooManyWrong
        ? sageCopy.patienceLostFinal
        : sageCopy.wrongAttempt(newWrongCount, 5),
    completed,
    defeated,
    defeatReason: defeatResult?.reason ?? null,
    durationMs,
    rankingPosition,
    isNewPersonalBest,
    attemptScore:
      completed && durationMs !== null
        ? scoreAttempt({
            durationMs,
            turnsCount: updatedAttempt.turns_count,
            session: sessionBefore,
            rankingPosition: rankingPosition ?? null,
            locale: sageLocale,
          })
        : undefined,
    reputation,
    reputationDelta,
    loreBeat,
  };
}
