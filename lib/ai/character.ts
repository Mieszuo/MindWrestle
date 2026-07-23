import { parseJsonObject } from "@/lib/ai/json";
import { callOpenRouter, characterModel, usageFromAttempt } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import { buildCharacterPrompt, readinessInstruction } from "@/lib/ai/prompts";
import type { JudgeOutput } from "@/lib/ai/judge";
import type { PlayerReputation } from "@/lib/game/reputation";
import { localeLanguageName, type Locale } from "@/lib/i18n/locale";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export type CharacterOutput = {
  message: string;
  narration: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string;
};

export async function generateCharacterReplyWithAi({
  level,
  attempt,
  recentMessages,
  judgeOutput,
  readiness,
  reputation,
  knownLore,
  locale,
}: {
  level: GameLevelRow;
  attempt: AttemptRow;
  recentMessages: MessageRow[];
  judgeOutput: JudgeOutput;
  readiness: number;
  reputation?: PlayerReputation | null;
  knownLore?: string[];
  locale: Locale;
}): Promise<CharacterOutput | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : characterModel();

  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.7,
        usageContext: usageFromAttempt(attempt, "character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              readinessInstruction: readinessInstruction(level, readiness, level.objective_type),
              readiness,
              reputation,
              knownLore,
              locale,
            }),
          },
        ],
      })
    : isDeepSeek
    ? await callDeepSeek({
        model,
        temperature: 0.7,
        usageContext: usageFromAttempt(attempt, "character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              readinessInstruction: readinessInstruction(level, readiness, level.objective_type),
              readiness,
              reputation,
              knownLore,
              locale,
            }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.7,
        usageContext: usageFromAttempt(attempt, "character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              readinessInstruction: readinessInstruction(level, readiness, level.objective_type),
              readiness,
              reputation,
              knownLore,
              locale,
            }),
          },
        ],
      });
  if (!content) return null;

  const parsed = parseJsonObject(content);
  const message = typeof parsed?.message === "string" ? parsed.message.trim() : "";
  if (!message) return null;

  return {
    message,
    narration: typeof parsed?.narration === "string" ? parsed.narration.trim() : "",
    provider: isGemini ? "gemini" : isDeepSeek ? "deepseek" : "openrouter",
    model,
  };
}
