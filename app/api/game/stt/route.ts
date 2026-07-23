import { NextResponse } from "next/server";

import { logAiUsage } from "@/lib/ai/log-usage";
import { getElevenLabsSttModelId, hasElevenLabsSttConfig, transcribeSpeech } from "@/lib/voice/elevenlabs-stt";
import { detectRequestLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/supabase/api-auth";
import { guardVoiceAttempt } from "@/lib/voice/attempt-guard.server";
import { consumeVoiceQuota } from "@/lib/voice/quota.server";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  if (!hasElevenLabsSttConfig()) {
    return NextResponse.json({ error: "STT is not configured" }, { status: 503 });
  }

  const rl = rateLimit(`stt:${auth.user.id}`, 15, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many STT requests. Try again shortly." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio file is too large" }, { status: 400 });
  }

  const attemptIdRaw = form?.get("attemptId");
  const levelIdRaw = form?.get("levelId");
  const attemptId = typeof attemptIdRaw === "string" ? attemptIdRaw : "";
  const levelId = typeof levelIdRaw === "string" ? Number(levelIdRaw) : NaN;

  if (!UUID_PATTERN.test(attemptId) || !Number.isInteger(levelId)) {
    return NextResponse.json({ error: "attemptId and levelId are required" }, { status: 400 });
  }

  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, attemptId, levelId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const voiceErrors = getDictionary(detectRequestLocale(request.headers)).content.voiceErrors;

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { sttRequests: 1 });
  if (!quota.allowed) {
    return NextResponse.json({ error: voiceErrors.sttDailyLimit }, { status: 429 });
  }

  const startedAt = Date.now();
  const sttModel = getElevenLabsSttModelId();
  try {
    const text = await transcribeSpeech(audio);
    await logAiUsage(
      {
        userId: auth.user.id,
        attemptId,
        levelId,
        callType: "stt",
      },
      sttModel,
      {
        // Voice: token fields hold character counts (ElevenLabs bills per character)
        promptTokens: 0,
        completionTokens: text.length,
        totalTokens: text.length,
        costUsd: null,
      },
      {
        provider: "elevenlabs",
        latencyMs: Date.now() - startedAt,
      },
    );

    if (!text) {
      return NextResponse.json({ error: voiceErrors.sttNoSpeech }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STT failed";
    await logAiUsage(
      {
        userId: auth.user.id,
        attemptId,
        levelId,
        callType: "stt",
      },
      sttModel,
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
      {
        provider: "elevenlabs",
        latencyMs: Date.now() - startedAt,
        success: false,
        errorMessage: message,
      },
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
