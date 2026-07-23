import { NextResponse } from "next/server";

import type { ScoreBreakdown } from "@/lib/game/types";
import { canAccessLevel } from "@/lib/game/progress";
import { fetchPlayerProgress } from "@/lib/supabase/progress.server";
import { requireAuth } from "@/lib/supabase/api-auth";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const body = (await request.json()) as {
    levelId?: number;
    sessionId?: string;
    score?: ScoreBreakdown;
    status?: "completed" | "mastered";
  };

  const levelId = Number(body.levelId);
  if (!Number.isFinite(levelId) || levelId < 1) {
    return NextResponse.json({ error: "Invalid levelId" }, { status: 400 });
  }

  const progress = await fetchPlayerProgress();
  if (!canAccessLevel(levelId, progress)) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  const completionStatus = body.status ?? "completed";

  const { data, error } = await auth.supabase
    .from("level_completions")
    .upsert(
      {
        user_id: auth.user.id,
        level_id: levelId,
        status: completionStatus,
        best_score: (body.score as Json | undefined) ?? null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,level_id" },
    )
    .select("level_id, status, best_score, completed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.sessionId) {
    await auth.supabase
      .from("game_sessions")
      .update({ status: "finished", updated_at: new Date().toISOString() })
      .eq("id", body.sessionId)
      .eq("user_id", auth.user.id);
  }

  return NextResponse.json({ completion: data });
}
