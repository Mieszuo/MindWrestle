import { NextResponse } from "next/server";

import { hasElevenLabsSttConfig } from "@/lib/voice/elevenlabs-stt";
import { requireAuth } from "@/lib/supabase/api-auth";
import { guardVoiceAttempt } from "@/lib/voice/attempt-guard.server";
import { consumeVoiceQuota } from "@/lib/voice/quota.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  if (!hasElevenLabsSttConfig()) {
    return NextResponse.json({ error: "STT is not configured" }, { status: 503 });
  }

  // Realtime STT sessions are billed per minute — only mint tokens for an owned in-progress attempt.
  const url = new URL(request.url);
  const attemptId = url.searchParams.get("attemptId") ?? "";
  const levelId = Number(url.searchParams.get("levelId"));

  if (!UUID_PATTERN.test(attemptId) || !Number.isInteger(levelId)) {
    return NextResponse.json({ error: "attemptId and levelId are required" }, { status: 400 });
  }

  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, attemptId, levelId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { sttRequests: 1 });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Dzienny limit rozpoznawania mowy wyczerpany." }, { status: 429 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "STT is not configured" }, { status: 503 });
  }

  const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to create STT token (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) {
    return NextResponse.json({ error: "Invalid STT token response" }, { status: 502 });
  }

  return NextResponse.json({ token: payload.token });
}
