import { booleanValue, numberValue, parseJsonObject, stringArray } from "@/lib/ai/json";
import { callOpenRouter, judgeModel } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import type { AiUsageContext } from "@/lib/ai/usage-types";
import { buildObjectiveCompletionJudgePrompt } from "@/lib/ai/objective-completion-prompts";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export interface ObjectiveCompletionJudgeResult {
  reasoningSteps?: string[];
  objectiveMet: boolean;
  confidence: number;
  reason: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string;
}

export async function evaluateObjectiveMetWithAi({
  level,
  recentMessages,
  playerMessage,
  characterMessage,
  usageContext,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerMessage: string;
  characterMessage: string;
  usageContext?: AiUsageContext;
}): Promise<ObjectiveCompletionJudgeResult | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : judgeModel();
  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "objective" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict hidden objective evaluator. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildObjectiveCompletionJudgePrompt({
              level,
              recentMessages,
              playerMessage,
              characterMessage,
            }),
          },
        ],
      })
    : isDeepSeek
    ? await callDeepSeek({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "objective" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict hidden objective evaluator. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildObjectiveCompletionJudgePrompt({
              level,
              recentMessages,
              playerMessage,
              characterMessage,
            }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.1,
        usageContext: usageContext
          ? { ...usageContext, callType: "objective" }
          : undefined,
        messages: [
          {
            role: "system",
            content: "You are a strict hidden objective evaluator. Output only valid JSON.",
          },
          {
            role: "user",
            content: buildObjectiveCompletionJudgePrompt({
              level,
              recentMessages,
              playerMessage,
              characterMessage,
            }),
          },
        ],
      });
  if (!content) return null;

  const parsed = parseJsonObject(content);
  if (!parsed) return null;

  return {
    reasoningSteps: stringArray(parsed.reasoningSteps),
    objectiveMet: booleanValue(parsed.objectiveMet),
    confidence: numberValue(parsed.confidence, 50),
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
    provider: isGemini ? "gemini" : isDeepSeek ? "deepseek" : "openrouter",
    model,
  };
}

