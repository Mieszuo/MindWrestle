import { evaluateSageKeyGuessWithAi } from "@/lib/ai/sage-key-guess-judge";
import type { AiUsageContext } from "@/lib/ai/usage-types";
import { combineObjectiveMetJudges } from "@/lib/game/evaluate-objective-met";
import { revealKeywordsMet, sageKeyLocationRevealMet } from "@/lib/game/objective-completion-helpers";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export interface SageKeyGuessEvaluation {
  correct: boolean;
  confidence: number;
  reason: string;
  provider: "openrouter" | "mock" | "deepseek" | "gemini";
  model?: string | null;
}

function strictSageKeyGuessMet(
  guess: string,
  level: GameLevelRow,
): { correct: boolean; reason: string } {
  const objectiveConfig = (level.objective_config ?? {}) as Record<string, unknown>;
  const met =
    revealKeywordsMet(guess, objectiveConfig, level.character_config, { minMatches: 2 }) ||
    sageKeyLocationRevealMet(guess);

  return {
    correct: met,
    reason: met ? "Player guess matches key location keywords." : "Player guess missing required location cues.",
  };
}

export async function evaluateSageKeyGuess({
  level,
  recentMessages,
  playerGuess,
  usageContext,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerGuess: string;
  usageContext?: AiUsageContext;
}): Promise<SageKeyGuessEvaluation> {
  const strict = strictSageKeyGuessMet(playerGuess, level);

  const aiResult = await evaluateSageKeyGuessWithAi({
    level,
    recentMessages,
    playerGuess,
    usageContext,
  });

  if (aiResult) {
    const correct = combineObjectiveMetJudges("SECRET_REVEAL", strict.correct, aiResult.objectiveMet);
    return {
      correct,
      confidence: correct ? Math.max(aiResult.confidence, strict.correct ? 70 : 0) : Math.min(aiResult.confidence, 25),
      reason: correct
        ? strict.correct && aiResult.objectiveMet
          ? aiResult.reason || strict.reason
          : strict.correct
            ? strict.reason
            : aiResult.reason || strict.reason
        : !strict.correct && !aiResult.objectiveMet
          ? `Incorrect (${strict.reason}; AI: ${aiResult.reason})`
          : !strict.correct
            ? strict.reason
            : aiResult.reason || strict.reason,
      provider: aiResult.provider,
      model: aiResult.model ?? null,
    };
  }

  return {
    correct: strict.correct,
    confidence: strict.correct ? 72 : 20,
    reason: strict.reason,
    provider: "mock",
    model: null,
  };
}
