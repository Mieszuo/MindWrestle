import { formatDuration } from "@/lib/game/progress";

import type { Db } from "./db-types";

const MAX_STORED_RANKING_ATTEMPTS = 10;

export type RankingRow = {
  user_id: string;
  duration_ms: number;
  turns_count: number;
  completed_at: string;
  display_name?: string | null;
};

export function compareRankingRows(a: RankingRow, b: RankingRow) {
  return a.turns_count - b.turns_count || a.duration_ms - b.duration_ms || a.completed_at.localeCompare(b.completed_at);
}

export function rankBestPerUser(rows: RankingRow[]): RankingRow[] {
  const bestByUser = new Map<string, RankingRow>();
  const sorted = [...rows].sort(compareRankingRows);

  for (const row of sorted) {
    if (!bestByUser.has(row.user_id)) bestByUser.set(row.user_id, row);
  }

  return Array.from(bestByUser.values()).sort(compareRankingRows);
}

export async function trimRankingHistory(supabase: Db, userId: string, levelId: number) {
  const { data, error } = await supabase
    .from("level_rankings")
    .select("id")
    .eq("user_id", userId)
    .eq("level_id", levelId)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length <= MAX_STORED_RANKING_ATTEMPTS) return;

  const staleIds = data.slice(MAX_STORED_RANKING_ATTEMPTS).map((row) => row.id);
  const { error: deleteError } = await supabase.from("level_rankings").delete().in("id", staleIds);
  if (deleteError) throw new Error(deleteError.message);
}

export async function getRankingPosition(supabase: Db, userId: string, levelId: number) {
  const { data, error } = await supabase
    .from("level_rankings")
    .select("user_id, display_name, duration_ms, turns_count, completed_at")
    .eq("level_id", levelId);

  if (error) throw new Error(error.message);

  const ranked = rankBestPerUser(data ?? []);
  const userIndex = ranked.findIndex((row) => row.user_id === userId);
  return userIndex >= 0 ? userIndex + 1 : null;
}

export async function getRanking(supabase: Db, userId: string, levelId: number) {
  const { data: level, error: levelError } = await supabase
    .from("game_levels")
    .select("id, title")
    .eq("id", levelId)
    .single();

  if (levelError || !level) throw new Error("Level not found");

  const { data, error } = await supabase
    .from("level_rankings")
    .select("user_id, display_name, duration_ms, turns_count, completed_at")
    .eq("level_id", levelId)
    .order("turns_count", { ascending: true })
    .order("duration_ms", { ascending: true })
    .order("completed_at", { ascending: true });

  if (error) throw new Error(error.message);

  const ranked = rankBestPerUser(data ?? []);
  const userIndex = ranked.findIndex((row) => row.user_id === userId);
  const userBest = userIndex >= 0 ? ranked[userIndex] : null;

  return {
    level,
    top: ranked.slice(0, 10).map((row) => ({
      displayName: row.display_name ?? "Gracz",
      durationMs: row.duration_ms,
      duration: formatDuration(row.duration_ms),
      turnsCount: row.turns_count,
      completedAt: row.completed_at,
    })),
    userBest: userBest
      ? {
          durationMs: userBest.duration_ms,
          duration: formatDuration(userBest.duration_ms),
          turnsCount: userBest.turns_count,
          position: userIndex + 1,
        }
      : null,
  };
}
