import { NextResponse } from "next/server";

import { defaultReputation, reputationToJson } from "@/lib/game/reputation";
import { defaultPlayerLoreState, playerLoreStateToJson } from "@/lib/game/lore/player-lore-state";
import { requireAuth } from "@/lib/supabase/api-auth";
import { ensureUserLevelProgress } from "@/lib/supabase/progress.server";

const tablesToClear = [
  "conversation_messages",
  "level_rankings",
  "conversation_attempts",
  "game_sessions",
  "level_completions",
  "user_level_progress",
] as const;

export async function POST() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  for (const table of tablesToClear) {
    const { error } = await auth.supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("user_id", auth.user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // RLS without a DELETE policy silently deletes 0 rows — surface that as a failure.
    const { count: remaining, error: remainingError } = await auth.supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.user.id);

    if (remainingError) return NextResponse.json({ error: remainingError.message }, { status: 500 });
    if ((remaining ?? 0) > 0) {
      return NextResponse.json(
        { error: `Nie udało się wyczyścić danych (${table}). Brak uprawnień DELETE w bazie.` },
        { status: 500 },
      );
    }
  }

  const { error: profileError } = await auth.supabase
    .from("profiles")
    .update({
      reputation: reputationToJson(defaultReputation()),
      lore_state: playerLoreStateToJson(defaultPlayerLoreState()),
      has_seen_game_intro: false,
      game_intro_seen_at: null,
      game_intro_version: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  await ensureUserLevelProgress(auth.user.id);

  return NextResponse.json({ ok: true });
}
