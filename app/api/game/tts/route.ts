import { NextResponse } from "next/server";
import { z } from "zod";

import { logAiUsage } from "@/lib/ai/log-usage";
import { deriveVoiceDelivery } from "@/lib/game/voice-delivery";
import { getVoiceProfile, hasElevenLabsConfig, TTS_MAX_CHARACTERS } from "@/lib/game/voice-profiles";
import { asEmotionState } from "@/lib/game/emotions";
import type { ResponseMode } from "@/lib/game/psychology/types";
import { parseVoicePerformance } from "@/lib/game/voice-performance";
import { detectRequestLocale, localeFromProfileSettings } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import {
  alignSpeechCues,
  buildSpeechPlan,
  preservesDisplayWords,
} from "@/lib/voice/speech-plan";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/supabase/api-auth";
import { validateBody } from "@/lib/validation";
import { guardVoiceAttempt } from "@/lib/voice/attempt-guard.server";
import { consumeVoiceQuota } from "@/lib/voice/quota.server";

const VALID_RESPONSE_MODES = new Set<ResponseMode>([
  "full_resistance",
  "defensive_deflection",
  "crack_in_armor",
  "partial_concession",
  "full_reveal",
]);

const ttsSchema = z.object({
  text: z.string().min(1).max(TTS_MAX_CHARACTERS),
  levelId: z.number().int().min(1).max(7),
  emotions: z.record(z.string(), z.number()).optional(),
  emotionDelta: z.record(z.string(), z.number()).optional(),
  responseMode: z.string().optional(),
  attemptId: z.string().uuid(),
  voicePerformance: z.unknown().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  if (!hasElevenLabsConfig()) {
    return NextResponse.json({ error: "TTS is not configured" }, { status: 503 });
  }

  const rl = rateLimit(`tts:${auth.user.id}`, 20, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many TTS requests. Try again shortly." }, { status: 429 });
  }

  const body = validateBody(await request.json().catch(() => null), ttsSchema);
  if (body instanceof NextResponse) return body;

  const levelId = body.levelId;
  const text = body.text.trim();

  // Voice is only synthesized for real NPC lines of the caller's own in-progress attempt.
  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, body.attemptId, levelId, {
    npcText: text,
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { ttsChars: text.length });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: getDictionary(detectRequestLocale(request.headers)).content.voiceErrors.ttsDailyLimit },
      { status: 429 },
    );
  }

  const profile = getVoiceProfile(levelId);
  if (!profile) {
    return NextResponse.json({ error: "Voice profile not found" }, { status: 503 });
  }

  const { data: playerProfile } = await auth.supabase
    .from("profiles")
    .select("settings")
    .eq("id", auth.user.id)
    .maybeSingle();
  const locale = localeFromProfileSettings(playerProfile?.settings) ?? "en";

  const emotions = asEmotionState(body.emotions ?? {});
  const responseMode =
    body.responseMode && VALID_RESPONSE_MODES.has(body.responseMode as ResponseMode)
      ? (body.responseMode as ResponseMode)
      : undefined;
  const voicePerformance = parseVoicePerformance(
    body.voicePerformance,
    (body.voicePerformance as Record<string, unknown> | undefined)?.source === "authored"
      ? "authored"
      : "ai",
  );

  const delivery = deriveVoiceDelivery(
    levelId,
    {
      stability: profile.stability,
      similarityBoost: profile.similarityBoost,
      speed: profile.speed,
      style: profile.style,
    },
    emotions,
    { emotionDelta: body.emotionDelta, responseMode },
  );

  const speechPlan = buildSpeechPlan({
    displayText: text,
    levelId,
    emotions,
    responseMode,
    voicePerformance,
  });
  if (!preservesDisplayWords(speechPlan.displayText, speechPlan.spokenText)) {
    return NextResponse.json({ error: "Speech direction changed canonical dialogue" }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const synthesis = await synthesizeSpeech(
      profile,
      delivery,
      speechPlan.spokenText,
      speechPlan.displayText,
      locale,
    );
    const cues = alignSpeechCues(speechPlan.sentences, synthesis.alignment);
    const encodedCues = Buffer.from(JSON.stringify(cues), "utf8").toString("base64url");
    await logAiUsage(
      {
        userId: auth.user.id,
        attemptId: body.attemptId,
        levelId,
        callType: "tts",
      },
      synthesis.modelId,
      {
        // Voice: token fields hold character counts (ElevenLabs bills per character)
        promptTokens: speechPlan.displayText.length,
        completionTokens: 0,
        totalTokens: speechPlan.displayText.length,
        costUsd: null,
      },
      {
        provider: "elevenlabs",
        latencyMs: Date.now() - startedAt,
      },
    );

    return new NextResponse(synthesis.audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=60",
        "X-Voice-Model": synthesis.modelId,
        "X-Voice-Direction-Source": speechPlan.directionSource,
        "X-Voice-Fallback": synthesis.fallbackUsed ? "1" : "0",
        "X-Voice-Cues": encodedCues,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    await logAiUsage(
      {
        userId: auth.user.id,
        attemptId: body.attemptId,
        levelId,
        callType: "tts",
      },
      profile.modelId,
      {
        promptTokens: speechPlan.displayText.length,
        completionTokens: 0,
        totalTokens: speechPlan.displayText.length,
        costUsd: null,
      },
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
