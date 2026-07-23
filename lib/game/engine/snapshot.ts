import { asEmotionState } from "@/lib/game/emotions";
import { sortConversationMessages } from "@/lib/game/conversation-message-order";
import {
  formatRumorForDisplay,
  parseReputationContext,
} from "@/lib/game/reputation";
import { parseVoicePerformance } from "@/lib/game/voice-performance";
import type { AttemptMessage, AttemptSnapshot, AttemptStatus } from "@/lib/game/types";

import type { AttemptRow, Db, MessageRow } from "./db-types";

export function toPublicMessage(row: MessageRow): AttemptMessage {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const narration = typeof metadata.narration === "string" ? metadata.narration.trim() : "";
  const keyGuess = metadata.keyGuess === true;
  const voicePerformance = parseVoicePerformance(
    metadata.voicePerformance,
    (metadata.voicePerformance as Record<string, unknown> | undefined)?.source === "authored"
      ? "authored"
      : "ai",
  );

  return {
    id: row.id,
    role: row.role as AttemptMessage["role"],
    content: row.content,
    turnIndex: row.turn_index,
    createdAt: row.created_at,
    narration: narration || undefined,
    keyGuess: keyGuess || undefined,
    voicePerformance,
  };
}

export function toAttemptSnapshot(attempt: AttemptRow, messages: MessageRow[] = []): AttemptSnapshot {
  const reputationContext = parseReputationContext(attempt.reputation_context);
  const rumorLine = reputationContext?.rumorLine ? formatRumorForDisplay(reputationContext.rumorLine) : null;

  return {
    id: attempt.id,
    levelId: attempt.level_id,
    status: attempt.status as AttemptStatus,
    startedAt: attempt.started_at,
    endedAt: attempt.ended_at,
    durationMs: attempt.duration_ms,
    turnsCount: attempt.turns_count,
    emotionState: asEmotionState(attempt.current_emotion_state),
    goalProgress: attempt.goal_progress,
    messages: messages.map(toPublicMessage),
    rumorLine,
  };
}

export async function fetchAttemptMessages(supabase: Db, attemptId: string) {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("turn_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return sortConversationMessages(data ?? []);
}
