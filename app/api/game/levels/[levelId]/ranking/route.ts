import { NextResponse } from "next/server";

import { getRanking } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";

interface RouteContext {
  params: Promise<{ levelId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const { levelId: levelIdParam } = await context.params;
  const levelId = Number(levelIdParam);
  if (!Number.isFinite(levelId) || levelId < 1) {
    return NextResponse.json({ error: "Invalid levelId" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getRanking(auth.supabase, auth.user.id, levelId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load ranking" },
      { status: 500 },
    );
  }
}
