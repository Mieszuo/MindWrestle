import { logAiUsage } from "@/lib/ai/log-usage";
import type { AiUsageContext } from "@/lib/ai/usage-types";

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export function hasDeepSeekConfig() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function deepseekModel() {
  return "deepseek-v4-flash";
}

export async function callDeepSeek({
  model = "deepseek-v4-flash",
  messages,
  temperature = 0.4,
  usageContext,
  jsonMode = true,
}: {
  model?: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  usageContext?: AiUsageContext;
  jsonMode?: boolean;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as DeepSeekResponse;
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = payload.error?.message ?? response.statusText;
      console.error("DeepSeek API error:", model, errorMessage);

      if (usageContext) {
        void logAiUsage(
          usageContext,
          model,
          { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
          { latencyMs, success: false, errorMessage, provider: "deepseek" },
        );
      }

      return null;
    }

    const rawUsage = payload.usage;
    const promptTokens = Math.max(0, Math.round(Number(rawUsage?.prompt_tokens) || 0));
    const completionTokens = Math.max(0, Math.round(Number(rawUsage?.completion_tokens) || 0));
    const totalTokens = Math.max(
      0,
      Math.round(Number(rawUsage?.total_tokens) || 0) || promptTokens + completionTokens,
    );

    // Approximate cost: $0.14/M input tokens, $0.28/M output tokens
    const costUsd = (promptTokens * 0.14 + completionTokens * 0.28) / 1_000_000;

    const usage = { promptTokens, completionTokens, totalTokens, costUsd };

    if (usageContext) {
      void logAiUsage(usageContext, model, usage, {
        latencyMs,
        success: true,
        provider: "deepseek",
      });
    }

    return payload.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Unknown DeepSeek error";
    console.error("DeepSeek request failed:", errorMessage);

    if (usageContext) {
      void logAiUsage(
        usageContext,
        model,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
        { latencyMs, success: false, errorMessage, provider: "deepseek" },
      );
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}
