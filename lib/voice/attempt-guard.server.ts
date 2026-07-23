import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export type VoiceAttemptGuardResult =
  | { ok: true }
  | { ok: false; status: 403 | 404 | 409; error: string };

export function matchesCharacterLine(messages: Array<{ content: string }>, text: string) {
  const wanted = text.trim();
  if (!wanted) return false;
  return messages.some((message) => message.content.trim() === wanted);
}

export async function guardVoiceAttempt(
  supabase: Db,
  userId: string,
  attemptId: string,
  levelId: number,
  options?: { npcText?: string },
): Promise<VoiceAttemptGuardResult> {
  const { data: attempt, error } = await supabase
    .from("conversation_attempts")
    .select("id, level_id, status")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, status: 404, error: error.message };
  if (!attempt) return { ok: false, status: 404, error: "Attempt not found" };
  if (attempt.level_id !== levelId) return { ok: false, status: 403, error: "Attempt does not match level" };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, status: 409, error: "Attempt is not in progress" };

  if (options?.npcText !== undefined) {
    const { data: messages, error: messagesError } = await supabase
      .from("conversation_messages")
      .select("content")
      .eq("attempt_id", attemptId)
      .eq("role", "CHARACTER")
      .order("created_at", { ascending: false })
      .limit(20);

    if (messagesError) return { ok: false, status: 404, error: messagesError.message };
    if (!matchesCharacterLine(messages ?? [], options.npcText)) {
      return { ok: false, status: 403, error: "Text is not a character line from this attempt" };
    }
  }

  return { ok: true };
}
