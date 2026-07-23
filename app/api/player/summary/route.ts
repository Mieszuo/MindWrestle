import { NextResponse } from "next/server";

import { parseReputation } from "@/lib/game/reputation";
import { formatDuration } from "@/lib/game/progress";
import { localeCookieOptions, LOCALE_COOKIE_NAME, mergeLocaleIntoSettings, parseProfileSettings, resolveProfileLocale } from "@/lib/i18n/locale";
import { requireAuth } from "@/lib/supabase/api-auth";
import type { Json } from "@/lib/supabase/database.types";

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const [profileResult, levelsResult, attemptsResult, progressResult] = await Promise.all([
      auth.supabase.from("profiles").select("display_name, created_at, updated_at, settings, reputation").eq("id", auth.user.id).maybeSingle(),
      auth.supabase
        .from("game_levels")
        .select("id, title, character_name, difficulty_label, order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true }),
      auth.supabase
        .from("conversation_attempts")
        .select("id, level_id, status, started_at, ended_at, duration_ms, turns_count, goal_progress, failure_reason")
        .eq("user_id", auth.user.id)
        .order("started_at", { ascending: false })
        .limit(80),
      auth.supabase
        .from("user_level_progress")
        .select("level_id, status, attempts_count, completed_attempts_count, failed_attempts_count, best_time_ms, last_time_ms, last_status, completed_at")
        .eq("user_id", auth.user.id),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (levelsResult.error) throw new Error(levelsResult.error.message);
    if (attemptsResult.error) throw new Error(attemptsResult.error.message);
    if (progressResult.error) throw new Error(progressResult.error.message);

    let profile = profileResult.data;
    const requestLocale = resolveProfileLocale(profile?.settings, request.headers);
    if (!profile) {
      const { data, error } = await auth.supabase
        .from("profiles")
        .insert({ id: auth.user.id, settings: mergeLocaleIntoSettings(undefined, requestLocale) as Json })
        .select("display_name, created_at, updated_at, settings, reputation")
        .single();
      if (error) throw new Error(error.message);
      profile = data;
    } else if (!parseProfileSettings(profile.settings).locale) {
      const settings = mergeLocaleIntoSettings(profile.settings, requestLocale);
      const { data, error } = await auth.supabase
        .from("profiles")
        .update({ settings: settings as Json, updated_at: new Date().toISOString() })
        .eq("id", auth.user.id)
        .select("display_name, created_at, updated_at, settings, reputation")
        .single();
      if (error) throw new Error(error.message);
      profile = data;
    }

    const profileSettings = parseProfileSettings(profile.settings);
    const locale = profileSettings.locale ?? requestLocale;

    const levels = levelsResult.data ?? [];
    const attempts = attemptsResult.data ?? [];
    const progressRows = progressResult.data ?? [];
    const completedAttempts = attempts.filter((attempt) => attempt.status === "COMPLETED");
    const failedAttempts = attempts.filter((attempt) => attempt.status === "FAILED");
    const abandonedAttempts = attempts.filter((attempt) => attempt.status === "ABANDONED");
    const completedDurations = completedAttempts
      .map((attempt) => attempt.duration_ms)
      .filter((duration): duration is number => typeof duration === "number");
    const completedTurns = completedAttempts.map((attempt) => attempt.turns_count);
    const bestDuration = completedDurations.length ? Math.min(...completedDurations) : null;
    const progressByLevel = new Map(progressRows.map((row) => [row.level_id, row]));

    const perLevel = levels.map((level) => {
      const levelAttempts = attempts.filter((attempt) => attempt.level_id === level.id);
      const levelCompleted = levelAttempts.filter((attempt) => attempt.status === "COMPLETED");
      const levelDurations = levelCompleted
        .map((attempt) => attempt.duration_ms)
        .filter((duration): duration is number => typeof duration === "number");
      const progress = progressByLevel.get(level.id);
      const bestTimeMs = progress?.best_time_ms ?? (levelDurations.length ? Math.min(...levelDurations) : null);

      return {
        levelId: level.id,
        title: level.title,
        characterName: level.character_name,
        difficulty: level.difficulty_label,
        attemptsCount: levelAttempts.length || progress?.attempts_count || 0,
        completedCount: levelCompleted.length || progress?.completed_attempts_count || 0,
        failedCount: levelAttempts.filter((attempt) => attempt.status === "FAILED").length || progress?.failed_attempts_count || 0,
        successRate: percent(levelCompleted.length || progress?.completed_attempts_count || 0, levelAttempts.length || progress?.attempts_count || 0),
        bestTimeMs,
        bestTime: bestTimeMs ? formatDuration(bestTimeMs) : null,
        averageTimeMs: average(levelDurations),
        averageTime: average(levelDurations) ? formatDuration(average(levelDurations)!) : null,
        averageTurns: average(levelCompleted.map((attempt) => attempt.turns_count)),
        lastStatus: levelAttempts[0]?.status ?? progress?.last_status ?? null,
        completedAt: progress?.completed_at ?? null,
      };
    });

    const recentAttempts = attempts.slice(0, 10).map((attempt) => {
      const level = levels.find((entry) => entry.id === attempt.level_id);
      return {
        id: attempt.id,
        levelId: attempt.level_id,
        characterName: level?.character_name ?? `Poziom ${attempt.level_id}`,
        status: attempt.status,
        startedAt: attempt.started_at,
        endedAt: attempt.ended_at,
        durationMs: attempt.duration_ms,
        duration: attempt.duration_ms ? formatDuration(attempt.duration_ms) : null,
        turnsCount: attempt.turns_count,
        goalProgress: attempt.goal_progress,
        failureReason: attempt.failure_reason,
      };
    });

    const response = NextResponse.json({
      profile: {
        displayName: profile.display_name,
        email: auth.user.email ?? null,
        createdAt: profile.created_at,
        settings: profileSettings,
        locale,
      },
      reputation: parseReputation(profile.reputation),
      summary: {
        attemptsCount: attempts.length,
        completedAttemptsCount: completedAttempts.length,
        failedAttemptsCount: failedAttempts.length,
        abandonedAttemptsCount: abandonedAttempts.length,
        successRate: percent(completedAttempts.length, attempts.length),
        averageTimeMs: average(completedDurations),
        averageTime: average(completedDurations) ? formatDuration(average(completedDurations)!) : null,
        bestTimeMs: bestDuration,
        bestTime: bestDuration ? formatDuration(bestDuration) : null,
        averageTurns: average(completedTurns),
        completedLevelsCount: progressRows.filter((row) => row.status === "COMPLETED").length,
        totalLevelsCount: levels.length,
      },
      perLevel,
      recentAttempts,
    });
    response.cookies.set(LOCALE_COOKIE_NAME, locale, localeCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load player summary" },
      { status: 500 },
    );
  }
}
