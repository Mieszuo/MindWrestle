import { booleanValue, numberValue, parseJsonObject } from "@/lib/ai/json";
import { callOpenRouter, judgeModel } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import type { AiUsageContext } from "@/lib/ai/usage-types";
import { buildSageKeyGuessJudgePrompt } from "@/lib/ai/sage-key-guess-prompts";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export interface SageKeyGuessJudgeResult {
  objectiveMet: boolean;
  confidence: number;
  reason: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string;
}

export async function evaluateSageKeyGuessWithAi({
  level,
  recentMessages,
  playerGuess,
  usageContext,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerGuess: string;
  usageContext?: AiUsageContext;
}): Promise<SageKeyGuessJudgeResult | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : judgeModel();
  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "sage_key_guess" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict location evaluator for the hidden Record Stone puzzle. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildSageKeyGuessJudgePrompt({ level, recentMessages, playerGuess }),
          },
        ],
      })
    : isDeepSeek
    ? await callDeepSeek({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "sage_key_guess" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict location evaluator for the hidden Record Stone puzzle. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildSageKeyGuessJudgePrompt({ level, recentMessages, playerGuess }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "sage_key_guess" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict location evaluator for the hidden Record Stone puzzle. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildSageKeyGuessJudgePrompt({ level, recentMessages, playerGuess }),
          },
        ],
      });
  if (!content) return null;

  const parsed = parseJsonObject(content);
  if (!parsed) return null;

  return {
    objectiveMet: booleanValue(parsed.objectiveMet),
    confidence: numberValue(parsed.confidence, 50),
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
    provider: isGemini ? "gemini" : isDeepSeek ? "deepseek" : "openrouter",
    model,
  };
}
