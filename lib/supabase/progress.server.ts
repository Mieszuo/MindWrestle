import { createClient } from "@/lib/supabase/server";
import {
  emptyPlayerProgress,
  playerProgressFromRows,
  type PlayerProgress,
} from "@/lib/game/progress";

export async function fetchPlayerProgress(): Promise<PlayerProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyPlayerProgress();
  }

  await ensureUserLevelProgress(user.id);

  const { data, error } = await supabase
    .from("user_level_progress")
    .select(
      "level_id, status, attempts_count, completed_attempts_count, failed_attempts_count, best_attempt_id, best_time_ms, last_attempt_id, last_time_ms, last_status, unlocked_at, completed_at",
    )
    .eq("user_id", user.id)
    .order("level_id", { ascending: true });

  if (error) {
    console.error("fetchPlayerProgress:", error.message);
    return emptyPlayerProgress();
  }

  return playerProgressFromRows(data ?? []);
}

export async function ensureUserLevelProgress(userId: string) {
  const supabase = await createClient();

  const { data: levels, error: levelsError } = await supabase
    .from("game_levels")
    .select("id, order_index")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (levelsError || !levels?.length) {
    if (levelsError) console.error("ensureUserLevelProgress levels:", levelsError.message);
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_level_progress")
    .select("level_id")
    .eq("user_id", userId);

  if (existingError) {
    console.error("ensureUserLevelProgress existing:", existingError.message);
    return;
  }

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
  if (error) console.error("ensureUserLevelProgress insert:", error.message);
}
