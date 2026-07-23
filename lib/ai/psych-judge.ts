import { booleanValue, numberValue, parseJsonObject, stringArray } from "@/lib/ai/json";
import { callOpenRouter, judgeModel, usageFromAttempt } from "@/lib/ai/openrouter";
import { hasDeepSeekConfig, callDeepSeek, deepseekModel } from "@/lib/ai/deepseek";
import { hasGeminiConfig, callGemini, geminiModel } from "@/lib/ai/gemini";
import { buildPsychJudgePrompt } from "@/lib/ai/psych-prompts";
import type { JudgeOutput } from "@/lib/ai/judge";
import { asEmotionState } from "@/lib/game/emotions";
import type { EmotionState } from "@/lib/game/types";
import type { MessageIntent, PsychState, InterpretationLens } from "@/lib/game/psychology/types";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export type PsychJudgeOutput = JudgeOutput & {
  messageIntent: MessageIntent;
  hiddenAxisDelta: Partial<PsychState["axes"]>;
  unconsciousDelta?: Partial<PsychState["unconscious"]>;
};

const MESSAGE_INTENTS = new Set<MessageIntent>([
  "compliment",
  "offer_help",
  "direct_pressure",
  "identity_attack",
  "identity_affirmation",
  "topic_probe",
  "playful_association",
  "storytelling",
  "fair_argument",
  "mockery",
  "neutral",
]);

function parseHiddenAxisDelta(raw: unknown): Partial<PsychState["axes"]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const keys = ["socialOpenness", "secretPressure", "beliefShift", "topicAvoidance", "identityDefense"] as const;
  return Object.fromEntries(
    keys.map((key) => [key, numberValue(record[key], 0)]).filter(([, value]) => value !== 0),
  );
}

export async function evaluateTurnWithPsychAi({
  level,
  attempt,
  psychState,
  recentMessages,
  playerMessage,
  rumorLine,
  knownLore,
  lens,
}: {
  level: GameLevelRow;
  attempt: AttemptRow;
  psychState: PsychState;
  recentMessages: MessageRow[];
  playerMessage: string;
  rumorLine?: string | null;
  knownLore?: string[];
  lens?: InterpretationLens | null;
}): Promise<PsychJudgeOutput | null> {
  const isGemini = hasGeminiConfig();
  const isDeepSeek = !isGemini && hasDeepSeekConfig();
  const model = isGemini ? geminiModel() : isDeepSeek ? deepseekModel() : judgeModel();
  const content = isGemini
    ? await callGemini({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "psych_judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildPsychJudgePrompt({
              level,
              attempt,
              psychState,
              recentMessages,
              playerMessage,
              rumorLine,
              knownLore,
              lens,
            }),
          },
        ],
      })
    : isDeepSeek
    ? await callDeepSeek({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "psych_judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildPsychJudgePrompt({
              level,
              attempt,
              psychState,
              recentMessages,
              playerMessage,
              rumorLine,
              knownLore,
              lens,
            }),
          },
        ],
      })
    : await callOpenRouter({
        model,
        temperature: 0.2,
        usageContext: usageFromAttempt(attempt, "psych_judge"),
        messages: [
          { role: "system", content: "You are a strict hidden evaluator. Output only valid JSON." },
          {
            role: "user",
            content: buildPsychJudgePrompt({
              level,
              attempt,
              psychState,
              recentMessages,
              playerMessage,
              rumorLine,
              knownLore,
              lens,
            }),
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

  const intentRaw = typeof parsed.messageIntent === "string" ? parsed.messageIntent : "neutral";
  const messageIntent = MESSAGE_INTENTS.has(intentRaw as MessageIntent)
    ? (intentRaw as MessageIntent)
    : "neutral";

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
    messageIntent,
    hiddenAxisDelta: parseHiddenAxisDelta(parsed.hiddenAxisDelta),
    unconsciousDelta:
      parsed.unconsciousDelta && typeof parsed.unconsciousDelta === "object" && !Array.isArray(parsed.unconsciousDelta)
        ? {
            doubt: numberValue((parsed.unconsciousDelta as Record<string, unknown>).doubt, 0),
            guilt: numberValue((parsed.unconsciousDelta as Record<string, unknown>).guilt, 0),
          }
        : undefined,
  };
}

export { asEmotionState };
