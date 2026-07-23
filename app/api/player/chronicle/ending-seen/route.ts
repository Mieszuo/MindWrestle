import { NextResponse } from "next/server";

import { markPlayerEndingSeen } from "@/lib/game/lore/persistence";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function PATCH() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const loreState = await markPlayerEndingSeen(auth.supabase, auth.user.id);
    return NextResponse.json({ loreState });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save ending state" },
      { status: 500 },
    );
  }
}
