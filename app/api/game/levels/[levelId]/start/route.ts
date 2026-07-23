import { NextResponse } from "next/server";
import { z } from "zod";

import { NoAttemptCreditsError } from "@/lib/billing/attempts.server";
import { startAttempt } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { validateParams } from "@/lib/validation";

const paramsSchema = z.object({
  levelId: z.string().regex(/^\d+$/, "Invalid levelId").transform(Number).pipe(
    z.number().int().min(1, "Invalid levelId"),
  ),
});

interface RouteContext {
  params: Promise<{ levelId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const rawParams = await context.params;
  const validated = validateParams(rawParams, paramsSchema);
  if (validated instanceof NextResponse) return validated;

  const levelId = validated.levelId;

  try {
    const attempt = await startAttempt(auth.supabase, auth.user.id, levelId);
    return NextResponse.json({ attempt });
  } catch (error) {
    if (error instanceof NoAttemptCreditsError) {
      return NextResponse.json(
        {
          error: "NO_ATTEMPTS_LEFT",
          freeRemaining: error.freeRemaining,
          paidRemaining: error.paidRemaining,
        },
        { status: 402 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to start attempt";
    return NextResponse.json({ error: message }, { status: message === "Level locked" ? 403 : 500 });
  }
}
