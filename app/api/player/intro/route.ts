import { NextResponse } from "next/server";

import { GAME_INTRO_VERSION } from "@/lib/supabase/game-intro.server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function PATCH() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const now = new Date().toISOString();
    const { data, error } = await auth.supabase
      .from("profiles")
      .upsert(
        {
          id: auth.user.id,
          has_seen_game_intro: true,
          game_intro_seen_at: now,
          game_intro_version: GAME_INTRO_VERSION,
          updated_at: now,
        },
        { onConflict: "id" },
      )
      .select("has_seen_game_intro, game_intro_seen_at, game_intro_version")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ intro: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać ukończenia prologu." },
      { status: 500 },
    );
  }
}
