import { logAiUsage } from "@/lib/ai/log-usage";
import type { AiUsageContext } from "@/lib/ai/usage-types";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: OpenRouterUsage;
  error?: {
    message?: string;
  };
};

function parseUsage(raw: OpenRouterUsage | undefined) {
  const promptTokens = Math.max(0, Math.round(Number(raw?.prompt_tokens) || 0));
  const completionTokens = Math.max(0, Math.round(Number(raw?.completion_tokens) || 0));
  const totalTokens = Math.max(
    0,
    Math.round(Number(raw?.total_tokens) || 0) || promptTokens + completionTokens,
  );
  const costRaw = raw?.cost;
  const costUsd =
    typeof costRaw === "number" && Number.isFinite(costRaw) ? costRaw : null;

  return { promptTokens, completionTokens, totalTokens, costUsd };
}

export function hasOpenRouterConfig() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function callOpenRouter({
  model,
  messages,
  temperature = 0.4,
  usageContext,
}: {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  usageContext?: AiUsageContext;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "MindWrestle",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    const payload = (await response.json()) as OpenRouterResponse;
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = payload.error?.message ?? response.statusText;
      console.error("OpenRouter error:", model, errorMessage);

      if (usageContext) {
        void logAiUsage(
          usageContext,
          model,
          { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
          { latencyMs, success: false, errorMessage },
        );
      }

      return null;
    }

    const usage = parseUsage(payload.usage);
    if (usageContext) {
      void logAiUsage(usageContext, model, usage, { latencyMs, success: true });
    }

    return payload.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Unknown OpenRouter error";
    console.error("OpenRouter request failed:", errorMessage);

    if (usageContext) {
      void logAiUsage(
        usageContext,
        model,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
        { latencyMs, success: false, errorMessage },
      );
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function judgeModel() {
  return process.env.OPENROUTER_JUDGE_MODEL ?? "openai/gpt-4o-mini";
}

export function characterModel() {
  return process.env.OPENROUTER_CHARACTER_MODEL ?? "deepseek/deepseek-v4-flash";
}

/** Build usage context from attempt row fields. */
export function usageFromAttempt(
  attempt: { id: string; user_id: string; level_id: number },
  callType: AiUsageContext["callType"],
): AiUsageContext {
  return {
    userId: attempt.user_id,
    attemptId: attempt.id,
    levelId: attempt.level_id,
    callType,
  };
}
