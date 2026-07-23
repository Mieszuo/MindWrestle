import type { SupabaseClient } from "@supabase/supabase-js";

import { envInt } from "@/lib/billing/config";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export function ttsDailyCharLimit() {
  return envInt("TTS_DAILY_CHAR_LIMIT", 40_000);
}

export function sttDailyRequestLimit() {
  return envInt("STT_DAILY_REQUEST_LIMIT", 200);
}

export async function consumeVoiceQuota(
  supabase: Db,
  userId: string,
  usage: { ttsChars?: number; sttRequests?: number },
) {
  const { data, error } = await supabase.rpc("consume_voice_quota", {
    p_user_id: userId,
    p_tts_chars: usage.ttsChars ?? 0,
    p_stt_requests: usage.sttRequests ?? 0,
    p_tts_daily_limit: ttsDailyCharLimit(),
    p_stt_daily_limit: sttDailyRequestLimit(),
  });

  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { allowed: Boolean(row?.allowed), ttsUsed: row?.tts_used ?? 0, sttUsed: row?.stt_used ?? 0 };
}
