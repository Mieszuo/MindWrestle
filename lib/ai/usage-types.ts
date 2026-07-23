export type AiCallType =
  | "judge"
  | "character"
  | "objective"
  | "sage_key_guess"
  | "psych_judge"
  | "psych_character"
  | "stt"
  | "tts";

export interface AiUsageContext {
  userId: string;
  attemptId?: string | null;
  levelId?: number | null;
  callType: AiCallType;
}

export interface AiUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
}
