import { NextResponse } from "next/server";

import { getLevelsPayload } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const payload = await getLevelsPayload(auth.supabase, auth.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load levels" },
      { status: 500 },
    );
  }
}
