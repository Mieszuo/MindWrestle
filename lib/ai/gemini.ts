import { logAiUsage } from "@/lib/ai/log-usage";
import type { AiUsageContext } from "@/lib/ai/usage-types";

type GeminiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeminiResponse = {
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

export function hasGeminiConfig() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function geminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

export async function callGemini({
  model = "gemini-2.5-flash",
  messages,
  temperature = 0.4,
  usageContext,
  jsonMode = true,
}: {
  model?: string;
  messages: GeminiMessage[];
  temperature?: number;
  usageContext?: AiUsageContext;
  jsonMode?: boolean;
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as GeminiResponse;
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = payload.error?.message ?? response.statusText;
      console.error("Gemini API error:", model, errorMessage);

      if (usageContext) {
        void logAiUsage(
          usageContext,
          model,
          { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
          { latencyMs, success: false, errorMessage, provider: "gemini" },
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

    // Approximate cost for gemini-2.5-flash (Google AI Studio pay-as-you-go): $0.15/M input, $0.60/M output
    // Verify at https://ai.google.dev/pricing if costs don't match
    const costUsd = (promptTokens * 0.15 + completionTokens * 0.6) / 1_000_000;

    const usage = { promptTokens, completionTokens, totalTokens, costUsd };

    if (usageContext) {
      void logAiUsage(usageContext, model, usage, {
        latencyMs,
        success: true,
        provider: "gemini",
      });
    }

    return payload.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("Gemini request failed:", errorMessage);

    if (usageContext) {
      void logAiUsage(
        usageContext,
        model,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null },
        { latencyMs, success: false, errorMessage, provider: "gemini" },
      );
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}
