"use client";

import { useEffect, useState } from "react";

import { getLevelsWithProgress } from "@/lib/game/mock-levels";
import { levelsFromApiRows } from "@/lib/game/levels-client";
import { emptyPlayerProgress, type PlayerProgress } from "@/lib/game/progress";
import type { Level } from "@/lib/game/types";
import type { Database } from "@/lib/supabase/database.types";
import { useLocale } from "@/components/i18n/locale-provider";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];

export function useGameLevels(progress: PlayerProgress) {
  const locale = useLocale();
  const [levels, setLevels] = useState<Level[]>(() => getLevelsWithProgress(progress));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLevels() {
      setLoading(true);
      try {
        const response = await fetch("/api/game/levels");
        if (!response.ok) throw new Error("Failed to load levels");
        const payload = (await response.json()) as {
          levels?: GameLevelRow[];
          progress?: PlayerProgress;
        };
        if (cancelled) return;
        const nextProgress = payload.progress ?? progress;
        if (payload.levels?.length) {
          setLevels(levelsFromApiRows(payload.levels, nextProgress, locale));
        } else {
          setLevels(getLevelsWithProgress(nextProgress));
        }
      } catch {
        if (!cancelled) setLevels(getLevelsWithProgress(progress));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLevels();
    return () => {
      cancelled = true;
    };
  }, [progress, locale]);

  return { levels, loading };
}

export function useGameLevelsFallback() {
  return { levels: getLevelsWithProgress(emptyPlayerProgress()), loading: false };
}
