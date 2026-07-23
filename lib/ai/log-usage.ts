import type { AiUsageContext, AiUsageSnapshot } from "@/lib/ai/usage-types";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service";

export async function logAiUsage(
  context: AiUsageContext,
  model: string,
  snapshot: AiUsageSnapshot,
  options?: {
    latencyMs?: number;
    success?: boolean;
    errorMessage?: string | null;
    provider?: string;
  },
) {
  if (!hasServiceRoleConfig()) return;

  try {
    const supabase = createServiceRoleClient();
    await supabase.from("ai_usage_events").insert({
      user_id: context.userId,
      attempt_id: context.attemptId ?? null,
      level_id: context.levelId ?? null,
      call_type: context.callType,
      model,
      provider: options?.provider ?? "openrouter",
      prompt_tokens: snapshot.promptTokens,
      completion_tokens: snapshot.completionTokens,
      total_tokens: snapshot.totalTokens,
      cost_usd: snapshot.costUsd,
      latency_ms: options?.latencyMs ?? null,
      success: options?.success ?? true,
      error_message: options?.errorMessage ?? null,
    });
  } catch (error) {
    console.error("Failed to log AI usage:", error instanceof Error ? error.message : error);
  }
}
