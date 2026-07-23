import { parseJsonObject } from "@/lib/ai/json";
import { callOpenRouter, characterModel, usageFromAttempt } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import { buildPsychCharacterPrompt } from "@/lib/ai/psych-prompts";
import { reputationToneForPrompt } from "@/lib/game/conversation-greetings";
import type { PsychJudgeOutput } from "@/lib/ai/psych-judge";
import { parseCouncilVotesFromCharacter } from "@/lib/game/psychology/inner-council";
import type { PlayerReputation } from "@/lib/game/reputation";
import { localeLanguageName, type Locale } from "@/lib/i18n/locale";
import type { PsychState, ResponseMode } from "@/lib/game/psychology/types";
import { parseVoicePerformance, type VoicePerformance } from "@/lib/game/voice-performance";
import type { Database, Json } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export type PsychCharacterOutput = {
  message: string;
  narration: string;
  internalDebate?: ReturnType<typeof parseCouncilVotesFromCharacter>;
  synthesis?: string;
  voicePerformance?: VoicePerformance;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string;
};

export async function generatePsychCharacterReplyWithAi({
  level,
  attempt,
  recentMessages,
  judgeOutput,
  psychState,
  responseMode,
  modeInstruction,
  reputation,
  innerMonologue,
  openingTone,
  knownLore,
  locale,
}: {
  level: GameLevelRow;
  attempt: AttemptRow;
  recentMessages: MessageRow[];
  judgeOutput: PsychJudgeOutput;
  psychState: PsychState;
  responseMode: ResponseMode;
  modeInstruction: string;
  reputation?: PlayerReputation | null;
  innerMonologue: boolean;
  openingTone?: string;
  knownLore?: string[];
  locale: Locale;
}): Promise<PsychCharacterOutput | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : characterModel();
  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.7,
        usageContext: usageFromAttempt(attempt, "psych_character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildPsychCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              psychState,
              modeInstruction,
              responseMode,
              reputationTone: reputation ? reputationToneForPrompt(reputation) : undefined,
              openingTone,
              innerMonologue,
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
        usageContext: usageFromAttempt(attempt, "psych_character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildPsychCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              psychState,
              modeInstruction,
              responseMode,
              reputationTone: reputation ? reputationToneForPrompt(reputation) : undefined,
              openingTone,
              innerMonologue,
              knownLore,
              locale,
            }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.7,
        usageContext: usageFromAttempt(attempt, "psych_character"),
        messages: [
          { role: "system", content: `You write concise in-character fantasy dialogue in ${localeLanguageName(locale)}. Output only valid JSON.` },
          {
            role: "user",
            content: buildPsychCharacterPrompt({
              level,
              attempt,
              recentMessages,
              judgeOutput,
              psychState,
              modeInstruction,
              responseMode,
              reputationTone: reputation ? reputationToneForPrompt(reputation) : undefined,
              openingTone,
              innerMonologue,
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
    internalDebate: innerMonologue ? parseCouncilVotesFromCharacter(parsed?.internalDebate) : undefined,
    synthesis: typeof parsed?.synthesis === "string" ? parsed.synthesis.trim() : undefined,
    voicePerformance: parseVoicePerformance(parsed?.voicePerformance),
    provider: isGemini ? "gemini" : isDeepSeek ? "deepseek" : "openrouter",
    model,
  };
}

export type { Json };
