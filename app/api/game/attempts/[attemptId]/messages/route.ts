import { NextResponse } from "next/server";
import { z } from "zod";

import { sendAttemptMessage } from "@/lib/game/engine.server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/supabase/api-auth";
import { validateBody } from "@/lib/validation";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000),
});

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const { attemptId } = await context.params;

  const rl = rateLimit(`msg:${auth.user.id}`, 30, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many messages. Try again shortly." }, { status: 429 });
  }

  const body = validateBody(await request.json().catch(() => null), messageSchema);
  if (body instanceof NextResponse) return body;

  try {
    const result = await sendAttemptMessage(auth.supabase, auth.user.id, attemptId, body.content);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    const status = message.includes("not found") ? 404 : message.includes("not in progress") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
