import { booleanValue, numberValue, parseJsonObject, stringArray } from "@/lib/ai/json";
import { callOpenRouter, judgeModel, usageFromAttempt } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import { buildJudgePrompt } from "@/lib/ai/prompts";
import type { EmotionState } from "@/lib/game/types";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export type JudgeOutput = {
  persuasionQuality: number;
  emotionDelta: EmotionState;
  goalProgressDelta: number;
  concessionLikely: boolean;
  resistanceTriggered: boolean;
  reactionTags: string[];
  memoryPatch: string;
  privateJudgeNote: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string;
};

export async function evaluateTurnWithAi({
  level,
  attempt,
  recentMessages,
  playerMessage,
  rumorLine,
  knownLore,
}: {
  level: GameLevelRow;
  attempt: AttemptRow;
  recentMessages: MessageRow[];
  playerMessage: string;
  rumorLine?: string | null;
  knownLore?: string[];
}): Promise<JudgeOutput | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : judgeModel();

  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildJudgePrompt({ level, attempt, recentMessages, playerMessage, rumorLine, knownLore }),
          },
        ],
      })
    : isDeepSeek
    ? await callDeepSeek({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildJudgePrompt({ level, attempt, recentMessages, playerMessage, rumorLine, knownLore }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildJudgePrompt({ level, attempt, recentMessages, playerMessage, rumorLine, knownLore }),
          },
        ],
      });
  if (!content) return null;

  const parsed = parseJsonObject(content);
  if (!parsed) return null;

  const rawDelta = parsed.emotionDelta;
  const emotionDelta: EmotionState =
    rawDelta && typeof rawDelta === "object" && !Array.isArray(rawDelta)
      ? Object.fromEntries(Object.entries(rawDelta).map(([key, value]) => [key, numberValue(value, 0)]))
      : {};

  return {
    persuasionQuality: numberValue(parsed.persuasionQuality, 50),
    emotionDelta,
    goalProgressDelta: numberValue(parsed.goalProgressDelta, 0),
    concessionLikely: booleanValue(parsed.concessionLikely),
    resistanceTriggered: booleanValue(parsed.resistanceTriggered),
    reactionTags: stringArray(parsed.reactionTags),
    memoryPatch: typeof parsed.memoryPatch === "string" ? parsed.memoryPatch : "",
    privateJudgeNote: typeof parsed.privateJudgeNote === "string" ? parsed.privateJudgeNote : "",
    provider: isGemini ? "gemini" : isDeepSeek ? "deepseek" : "openrouter",
    model,
  };
}
