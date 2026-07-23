import type { AttemptRow, Db } from "./db-types";
import {
  compareRankingRows,
  getRankingPosition,
  trimRankingHistory,
  type RankingRow,
} from "./ranking";

export async function completeProgressAndRanking(
  supabase: Db,
  userId: string,
  attempt: AttemptRow,
  durationMs: number,
  completedAt: string,
) {
  const { data: progress } = await supabase
    .from("user_level_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", attempt.level_id)
    .single();

  const isNewPersonalBest = await (async () => {
    if (!progress?.best_attempt_id) return true;

    const { data: bestAttempt } = await supabase
      .from("conversation_attempts")
      .select("turns_count, duration_ms")
      .eq("id", progress.best_attempt_id)
      .maybeSingle();

    if (!bestAttempt?.duration_ms) return true;

    const candidate: RankingRow = {
      user_id: userId,
      turns_count: attempt.turns_count,
      duration_ms: durationMs,
      completed_at: completedAt,
    };
    const previousBest: RankingRow = {
      user_id: userId,
      turns_count: bestAttempt.turns_count,
      duration_ms: bestAttempt.duration_ms,
      completed_at: "",
    };

    return compareRankingRows(candidate, previousBest) < 0;
  })();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const { error: rankingInsertError } = await supabase.from("level_rankings").insert({
    user_id: userId,
    level_id: attempt.level_id,
    attempt_id: attempt.id,
    duration_ms: durationMs,
    turns_count: attempt.turns_count,
    completed_at: completedAt,
    display_name: profile?.display_name ?? null,
  });

  if (rankingInsertError) throw new Error(rankingInsertError.message);

  await trimRankingHistory(supabase, userId, attempt.level_id);

  if (progress) {
    await (supabase.rpc as any)("increment_level_progress_counter", {
      p_user_id: userId,
      p_level_id: attempt.level_id,
      p_column: "completed_attempts_count",
    });

    await supabase
      .from("user_level_progress")
      .update({
        status: "COMPLETED",
        best_attempt_id: isNewPersonalBest ? attempt.id : progress.best_attempt_id,
        best_time_ms: isNewPersonalBest ? durationMs : progress.best_time_ms,
        last_attempt_id: attempt.id,
        last_time_ms: durationMs,
        last_status: "COMPLETED",
        completed_at: progress.completed_at ?? completedAt,
        updated_at: completedAt,
      })
      .eq("id", progress.id);
  }

  const { data: currentLevel } = await supabase
    .from("game_levels")
    .select("order_index")
    .eq("id", attempt.level_id)
    .single();

  const currentOrderIndex = currentLevel?.order_index ?? 0;

  const { data: nextLevel } = await supabase
    .from("game_levels")
    .select("id")
    .eq("order_index", currentOrderIndex + 1)
    .single();

  if (nextLevel) {
    const { data: nextProgress } = await supabase
      .from("user_level_progress")
      .select("id, status")
      .eq("user_id", userId)
      .eq("level_id", nextLevel.id)
      .maybeSingle();

    if (nextProgress?.status === "LOCKED") {
      await supabase
        .from("user_level_progress")
        .update({ status: "CURRENT", unlocked_at: completedAt, updated_at: completedAt })
        .eq("id", nextProgress.id);
    }
  }

  const rankingPosition = await getRankingPosition(supabase, userId, attempt.level_id);

  return { isNewPersonalBest, rankingPosition };
}

export async function recordFailedAttempt(
  supabase: Db,
  userId: string,
  attempt: AttemptRow,
  durationMs: number,
  failedAt: string,
) {
  const { data: progress } = await supabase
    .from("user_level_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", attempt.level_id)
    .single();

  if (!progress) return;

  await (supabase.rpc as any)("increment_level_progress_counter", {
    p_user_id: userId,
    p_level_id: attempt.level_id,
    p_column: "failed_attempts_count",
  });

  await supabase
    .from("user_level_progress")
    .update({
      last_attempt_id: attempt.id,
      last_time_ms: durationMs,
      last_status: "FAILED",
      updated_at: failedAt,
    })
    .eq("id", progress.id);
}
