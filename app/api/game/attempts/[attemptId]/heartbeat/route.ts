import { NextResponse } from "next/server";

import { heartbeatAttempt } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const { attemptId } = await context.params;

  try {
    const attempt = await heartbeatAttempt(auth.supabase, auth.user.id, attemptId);
    return NextResponse.json({ attempt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update heartbeat" },
      { status: 500 },
    );
  }
}
