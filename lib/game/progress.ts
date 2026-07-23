import type { LevelState, MapConfig } from "@/lib/game/mapScene";
import type { AttemptStatus, LevelStatus, ScoreBreakdown, UserLevelStatus } from "@/lib/game/types";

export const TOTAL_LEVELS = 7;

/**
 * Tymczasowy tryb podglądu podczas developmentu.
 * Ustaw na false, aby przywrócić standardowe odblokowywanie po kolei.
 */
export const TEMPORARILY_UNLOCK_ALL_LEVELS = false;

export type CompletionStatus = "completed" | "mastered";

export type LevelCompletion = {
  levelId: number;
  status: CompletionStatus;
  bestScore?: ScoreBreakdown | null;
  completedAt?: string;
  bestTimeMs?: number | null;
  lastTimeMs?: number | null;
  lastStatus?: AttemptStatus | null;
};

export type LevelProgressEntry = {
  levelId: number;
  status: UserLevelStatus;
  attemptsCount: number;
  completedAttemptsCount: number;
  failedAttemptsCount: number;
  bestAttemptId: string | null;
  bestTimeMs: number | null;
  lastAttemptId: string | null;
  lastTimeMs: number | null;
  lastStatus: AttemptStatus | null;
  unlockedAt: string | null;
  completedAt: string | null;
};

export type PlayerProgress = {
  completions: LevelCompletion[];
  levels: LevelProgressEntry[];
};

export function emptyPlayerProgress(): PlayerProgress {
  return { completions: [], levels: [] };
}

export function isLevelCompleted(levelId: number, progress: PlayerProgress): boolean {
  if (progress.levels.length === 0) return false;
  const entry = progress.levels.find((level) => level.levelId === levelId);
  if (entry) return entry.status === "COMPLETED";

  return progress.completions.some(
    (entry) => entry.levelId === levelId && entry.status !== undefined,
  );
}

export function getCompletionStatus(
  levelId: number,
  progress: PlayerProgress,
): CompletionStatus | null {
  return progress.completions.find((entry) => entry.levelId === levelId)?.status ?? null;
}

export function isLevelUnlocked(levelId: number, progress: PlayerProgress): boolean {
  if (TEMPORARILY_UNLOCK_ALL_LEVELS) return levelId >= 1 && levelId <= TOTAL_LEVELS;
  if (progress.levels.length === 0) return true;
  const entry = progress.levels.find((level) => level.levelId === levelId);
  if (entry) return entry.status !== "LOCKED";

  if (levelId <= 1) return true;
  return isLevelCompleted(levelId - 1, progress);
}

export function getLevelStatus(levelId: number, progress: PlayerProgress): LevelStatus {
  const completion = getCompletionStatus(levelId, progress);
  if (completion === "mastered") return "mastered";
  if (completion === "completed") return "unlocked";
  return isLevelUnlocked(levelId, progress) ? "unlocked" : "locked";
}

/** Map UI: blocked / current / done. */
export function getMapLevelState(levelId: number, progress: PlayerProgress): LevelState {
  if (isLevelCompleted(levelId, progress)) return "done";
  if (isLevelUnlocked(levelId, progress)) return "current";
  return "blocked";
}

/** First unlocked-but-incomplete level — used for the “Aktualny” highlight on the map. */
export function getActiveLevelId(progress: PlayerProgress): number {
  for (let levelId = 1; levelId <= TOTAL_LEVELS; levelId++) {
    if (isLevelUnlocked(levelId, progress) && !isLevelCompleted(levelId, progress)) {
      return levelId;
    }
  }

  return TOTAL_LEVELS;
}

export function applyProgressToMap(map: MapConfig, progress: PlayerProgress): MapConfig {
  return {
    ...map,
    levels: map.levels.map((level) => ({
      ...level,
      state: getMapLevelState(level.id, progress),
    })),
  };
}

export function playerProgressFromRows(
  rows: Array<{
    level_id: number;
    status: string;
    attempts_count?: number;
    completed_attempts_count?: number;
    failed_attempts_count?: number;
    best_attempt_id?: string | null;
    best_time_ms?: number | null;
    last_attempt_id?: string | null;
    last_time_ms?: number | null;
    last_status?: string | null;
    unlocked_at?: string | null;
    completed_at?: string | null;
    best_score?: unknown;
  }>,
): PlayerProgress {
  const levels = rows.map((row) => ({
    levelId: row.level_id,
    status: row.status as UserLevelStatus,
    attemptsCount: row.attempts_count ?? 0,
    completedAttemptsCount: row.completed_attempts_count ?? 0,
    failedAttemptsCount: row.failed_attempts_count ?? 0,
    bestAttemptId: row.best_attempt_id ?? null,
    bestTimeMs: row.best_time_ms ?? null,
    lastAttemptId: row.last_attempt_id ?? null,
    lastTimeMs: row.last_time_ms ?? null,
    lastStatus: (row.last_status as AttemptStatus | null) ?? null,
    unlockedAt: row.unlocked_at ?? null,
    completedAt: row.completed_at ?? null,
  }));

  return {
    levels,
    completions: rows
      .filter((row) => row.status === "COMPLETED" || row.status === "completed" || row.status === "mastered")
      .map((row) => ({
        levelId: row.level_id,
        status: "completed" as const,
        bestScore: row.best_time_ms
          ? ({ time: formatDuration(row.best_time_ms), levelId: row.level_id } as ScoreBreakdown)
          : ((row.best_score as ScoreBreakdown | null) ?? null),
        completedAt: row.completed_at ?? undefined,
        bestTimeMs: row.best_time_ms ?? null,
        lastTimeMs: row.last_time_ms ?? null,
        lastStatus: (row.last_status as AttemptStatus | null) ?? null,
      })),
  };
}

export function canAccessLevel(levelId: number, progress: PlayerProgress): boolean {
  return isLevelUnlocked(levelId, progress);
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
