import { NextResponse } from "next/server";

import { logAiUsage } from "@/lib/ai/log-usage";
import { getElevenLabsRealtimeSttModelId } from "@/lib/voice/elevenlabs-stt";
import { requireAuth } from "@/lib/supabase/api-auth";

interface UsageBody {
  text?: string;
  attemptId?: string;
  levelId?: number;
  latencyMs?: number;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  let body: UsageBody;
  try {
    body = (await request.json()) as UsageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  await logAiUsage(
    {
      userId: auth.user.id,
      attemptId: body.attemptId ?? null,
      levelId: typeof body.levelId === "number" ? body.levelId : null,
      callType: "stt",
    },
    getElevenLabsRealtimeSttModelId(),
    {
      // Voice: token fields hold character counts (ElevenLabs bills per character)
      promptTokens: 0,
      completionTokens: text.length,
      totalTokens: text.length,
      costUsd: null,
    },
    {
      provider: "elevenlabs",
      latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : undefined,
    },
  );

  return NextResponse.json({ ok: true });
}
