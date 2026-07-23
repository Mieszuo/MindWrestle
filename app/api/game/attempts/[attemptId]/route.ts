import { NextResponse } from "next/server";

import { getAttemptReplay } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const { attemptId } = await context.params;

  try {
    const payload = await getAttemptReplay(auth.supabase, auth.user.id, attemptId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load attempt";
    return NextResponse.json({ error: message }, { status: message.includes("not found") ? 404 : 500 });
  }
}
