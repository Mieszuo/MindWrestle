"use client";

import { useCallback, useEffect, useState } from "react";

import {
  emptyPlayerProgress,
  playerProgressFromRows,
  type PlayerProgress,
} from "@/lib/game/progress";
import { createClient } from "@/lib/supabase/client";

async function ensureUserLevelProgressClient(userId: string) {
  const supabase = createClient();

  const { data: levels, error: levelsError } = await supabase
    .from("game_levels")
    .select("id, order_index")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (levelsError || !levels?.length) return;

  const { data: existing } = await supabase
    .from("user_level_progress")
    .select("level_id")
    .eq("user_id", userId);

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

  if (missing.length) {
    await supabase.from("user_level_progress").insert(missing);
  }
}

export function usePlayerProgress() {
  const [progress, setProgress] = useState<PlayerProgress>(emptyPlayerProgress());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProgress(emptyPlayerProgress());
        setLoading(false);
        return;
      }

      await ensureUserLevelProgressClient(user.id);

      const { data, error: fetchError } = await supabase
        .from("user_level_progress")
        .select(
          "level_id, status, attempts_count, completed_attempts_count, failed_attempts_count, best_attempt_id, best_time_ms, last_attempt_id, last_time_ms, last_status, unlocked_at, completed_at",
        )
        .eq("user_id", user.id)
        .order("level_id", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setProgress(emptyPlayerProgress());
      } else {
        setProgress(playerProgressFromRows(data ?? []));
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Nie udało się pobrać postępu gracza.");
      setProgress(emptyPlayerProgress());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return { progress, loading, error, refresh };
}
