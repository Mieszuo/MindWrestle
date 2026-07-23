import { hiddenKnowledgeForPrompt } from "@/lib/game/character-speech";
import { recentConversation } from "@/lib/ai/prompts";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export function buildSageKeyGuessJudgePrompt({
  level,
  recentMessages,
  playerGuess,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerGuess: string;
}) {
  const hidden = hiddenKnowledgeForPrompt(level.character_config);
  const recordStoneLocation =
    hidden.trim() || "Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.";

  return `
You evaluate whether the PLAYER correctly identified where the sage's Record Stone (Kamień Zapisu) is hidden.

Hidden truth (canonical location):
"${recordStoneLocation}"

Conversation so far:
${recentConversation(recentMessages)}

Player's location guess:
"${playerGuess}"

Rules — objectiveMet is TRUE only when the player's guess identifies the same place as the hidden truth:
- Must convey the library third step meeting shadow/stone motif — not a vague library mention alone.
- TRUE examples: "trzeci krok biblioteki przy cieniu", "tam gdzie trzeci krok spotyka cień", "kamień przy trzecim kroku w bibliotece".
- FALSE examples: only "biblioteka", only "cień", only "kamień" without locating the third step; unrelated rooms; generic riddles without the location.

Output JSON only:
{"objectiveMet": boolean, "confidence": number, "reason": string}
`.trim();
}
