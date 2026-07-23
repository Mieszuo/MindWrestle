import { NextResponse } from "next/server";
import { z } from "zod";

import { submitSageKeyGuess } from "@/lib/game/engine.server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";

const guessSchema = z.object({
  guess: z.string().min(1, "Guess cannot be empty").max(200),
});

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const { attemptId } = await context.params;

  const rl = rateLimit(`guess:${auth.user.id}`, 10, 30_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many guesses. Wait a moment." }, { status: 429 });
  }

  const body = validateBody(await request.json().catch(() => null), guessSchema);
  if (body instanceof NextResponse) return body;

  try {
    const result = await submitSageKeyGuess(auth.supabase, auth.user.id, attemptId, body.guess);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit Record Stone location guess";
    const status = message.includes("not found")
      ? 404
      : message.includes("not in progress") || message.includes("Poczekaj")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
