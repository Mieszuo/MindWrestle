import { evaluateObjectiveMetWithAi } from "@/lib/ai/objective-completion-judge";
import type { AiUsageContext } from "@/lib/ai/usage-types";
import { mockObjectiveCompletionJudge } from "@/lib/game/mock-objective-completion-judge";
import { evaluateStrictObjectiveMet } from "@/lib/game/strict-objective-met";
import type { Locale } from "@/lib/i18n/locale";
import type { Database } from "@/lib/supabase/database.types";


type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export interface ObjectiveMetEvaluation {
  objectiveMet: boolean;
  confidence: number;
  reason: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string | null;
  reasoningSteps?: string[];
}

/** Levels 5 (Sage) and 7 (God) require the deterministic strict check AND the AI
 *  judge to agree — L7's `godConcessionMet` is liberal enough not to false-veto a
 *  real world-truth, but blocks empty mysticism the AI might wave through.
 *  Other in-game levels rely on the AI judge (their per-level regexes are too
 *  brittle to hard-AND without making the level unwinnable).
 *  Fallback AND/OR logic applies only when levelId is omitted (tests, sage guess).
 *
 *  The strict checks for levels 5/7 are Polish-only regexes with no English
 *  fallback, so they can never fire against AI-generated English replies. The
 *  AND-gate is therefore only meaningful (and only preserved) for `locale === "pl"`;
 *  for `locale === "en"` these levels fall back to AI-judge-alone, same as the
 *  other in-game levels, so the level remains completable in English.
 *  `locale` defaults to "pl" to preserve behavior for callers that don't pass it
 *  (e.g. the sage key-guess call site, which never hits the levelId 5/7 branch anyway). */
export function combineObjectiveMetJudges(
  objectiveType: string,
  strictMet: boolean,
  aiMet: boolean,
  levelId?: number,
  locale: Locale = "pl"
): boolean {
  if ((levelId === 5 || levelId === 7) && locale === "pl") {
    return strictMet && aiMet;
  }
  if (levelId !== undefined) {
    return aiMet;
  }
  if (objectiveType === "AGREEMENT" || objectiveType === "SECRET_REVEAL") {
    return strictMet && aiMet;
  }
  return strictMet || aiMet;
}


function recentContextText(messages: MessageRow[]) {
  return messages.map((message) => message.content).join("\n");
}

function strictCheck(
  level: GameLevelRow,
  characterMessage: string,
  recentMessages: MessageRow[],
) {
  return evaluateStrictObjectiveMet({
    levelId: level.id,
    objectiveType: level.objective_type,
    objectiveConfig: (level.objective_config ?? {}) as Record<string, unknown>,
    characterConfig: level.character_config,
    characterMessage,
    recentContext: recentContextText(recentMessages),
  });
}

export async function evaluateObjectiveMet({
  level,
  recentMessages,
  playerMessage,
  characterMessage,
  usageContext,
  locale,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerMessage: string;
  characterMessage: string;
  usageContext?: AiUsageContext;
  locale: Locale;
}): Promise<ObjectiveMetEvaluation> {
  const strict = strictCheck(level, characterMessage, recentMessages);

  const aiResult = await evaluateObjectiveMetWithAi({
    level,
    recentMessages,
    playerMessage,
    characterMessage,
    usageContext,
  });

  if (aiResult) {
    const objectiveMet = combineObjectiveMetJudges(
      level.objective_type,
      strict.objectiveMet,
      aiResult.objectiveMet,
      level.id,
      locale
    );
    return {
      objectiveMet,
      confidence: objectiveMet ? Math.max(aiResult.confidence, level.id === 5 && strict.objectiveMet ? 70 : 0) : Math.min(aiResult.confidence, 25),
      reason: objectiveMet
        ? level.id === 5
          ? aiResult.reason || strict.reason
          : aiResult.reason
        : level.id === 5 && !strict.objectiveMet
          ? `Strict objective check failed (${strict.reason})`
          : aiResult.reason,
      provider: aiResult.provider,
      model: aiResult.model ?? null,
      reasoningSteps: aiResult.reasoningSteps,
    };
  }


  const mock = mockObjectiveCompletionJudge({
    levelId: level.id,
    objectiveType: level.objective_type,
    objectiveConfig: (level.objective_config ?? {}) as Record<string, unknown>,
    characterConfig: level.character_config,
    characterMessage,
    recentContext: recentContextText(recentMessages),
  });

  return {
    objectiveMet: mock.objectiveMet,
    confidence: mock.objectiveMet ? 72 : 20,
    reason: mock.reason,
    provider: "mock",
    model: null,
  };
}

