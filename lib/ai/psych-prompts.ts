import { positiveTagsForPrompt } from "@/lib/game/reputation-triggers";
import { redLineTagsForPrompt } from "@/lib/game/resistance-triggers";
import { councilAgentLabels } from "@/lib/game/psychology/level-profiles";
import { localePromptInstruction, type Locale } from "@/lib/i18n/locale";
import type { PsychState, InterpretationLens } from "@/lib/game/psychology/types";
import type { Database } from "@/lib/supabase/database.types";
import { recentConversation } from "@/lib/ai/prompts";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export function buildPsychJudgePrompt({
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
}) {
  const rumorSection = rumorLine
    ? `\nWorld rumor about the player:\n${rumorLine}\n`
    : "";

  const lensSection = lens
    ? `\nInterpretation lens (how this NPC reads the player):\n${JSON.stringify(lens)}\n`
    : "";
  const loreSection = knownLore?.length
    ? `\nKnown truths already recovered by the traveler:\n- ${knownLore.join("\n- ")}\n`
    : "";

  return `You are the hidden game judge for a fantasy dialogue game with a psychological persuasion engine.

Evaluate the player's latest message. You do NOT speak to the player. Output valid JSON only.

Critical rules:
- Compliments and warmth may increase social openness but must NOT increase secretPressure or beliefShift unless the message meaningfully engages the objective topic.
- Hollow flattery must be tagged hollow_flattery.
- Identity attacks increase resistance; identity-affirming arguments may open beliefShift slowly.
- Respect character red lines and positive tags.
- Keep emotion deltas moderate; scale penalties with difficulty ${level.difficulty_score}/10.
- Evaluate how the player uses 'Known truths' candidates. If the player uses an unlocked truth in a way that is specific, relevant to this character's wound, and logically connected to the current objective, increase concession significantly and reward with uses_previous_lore.
- Do not reward mere keyword mentions, vague references to truth/silence/memory, or claims based on lore the player has not recovered.
- If the lore is used aggressively, inaccurately, or manipulatively, suspicion/resistance may increase instead. Tag with weaponizes_lore.
- IMPORTANT: Do not invent or hallucinate new truthIds, lore fragments, or tags. Only evaluate based on the provided 'Known truths'.

Hidden psychological axes (current):
${JSON.stringify(psychState.axes)}

Relationship summary:
${psychState.relationshipSummary || "None yet."}

Unconscious tension:
${JSON.stringify(psychState.unconscious)}
${rumorSection}${lensSection}${loreSection}
Character red lines:
${redLineTagsForPrompt(level.id)}

Positive reputation tags:
${positiveTagsForPrompt(level.id)}

Return JSON:
{
  "persuasionQuality": 0-100,
  "emotionDelta": { "<visibleEmotionKey>": -15 to 10 },
  "goalProgressDelta": -5 to 8,
  "concessionLikely": boolean,
  "resistanceTriggered": boolean,
  "reactionTags": string[],
  "memoryPatch": "one short sentence to append to relationship memory",
  "privateJudgeNote": string,
  "messageIntent": "compliment|offer_help|direct_pressure|identity_attack|identity_affirmation|topic_probe|playful_association|storytelling|fair_argument|mockery|neutral",
  "hiddenAxisDelta": {
    "socialOpenness": -15 to 15,
    "secretPressure": -10 to 15,
    "beliefShift": -10 to 15,
    "topicAvoidance": -15 to 15,
    "identityDefense": -15 to 15
  },
  "unconsciousDelta": { "doubt": -10 to 10, "guilt": -10 to 10 }
}

Only one of secretPressure or beliefShift should move meaningfully per turn, matching the level objective.

Character profile:
${JSON.stringify(level.character_config)}

Visible emotion state:
${JSON.stringify(attempt.current_emotion_state)}

Level objective:
${JSON.stringify(level.objective_config)}

Recent conversation:
${recentConversation(recentMessages)}

Player latest message:
${playerMessage}`;
}

export function buildPsychCharacterPrompt({
  level,
  attempt,
  recentMessages,
  judgeOutput,
  psychState,
  modeInstruction,
  responseMode,
  reputationTone,
  openingTone,
  innerMonologue,
  knownLore,
  locale,
}: {
  level: GameLevelRow;
  attempt: AttemptRow;
  recentMessages: MessageRow[];
  judgeOutput: Record<string, unknown>;
  psychState: PsychState;
  modeInstruction: string;
  responseMode: string;
  reputationTone?: string;
  openingTone?: string;
  innerMonologue: boolean;
  knownLore?: string[];
  locale: Locale;
}) {
  const council = councilAgentLabels(level.id).join(", ");
  const loreSection = knownLore?.length
    ? `\nTruths this traveler may legitimately know:\n- ${knownLore.join("\n- ")}\n`
    : "";
  const outputSchema = innerMonologue
    ? `{
  "internalDebate": [{ "agent": string, "stance": -100..100, "reason": string }],
  "synthesis": "one sentence internal summary",
  "message": "character dialogue in the requested reply language",
  "narration": "optional short narration in the requested reply language or empty string",
  "voicePerformance": null or {
    "direction": "softly" | "quietly" | "hesitantly" | "amused" | "angry but controlled" | "warmly" | "cautiously" | "firmly" | "mischievously" | "solemnly" | "thoughtfully" | "sincerely" | "distantly" | "calmly" | "authoritatively",
    "pauseAfterSentence": number[],
    "subtlety": "subtle" | "balanced" | "pronounced"
  }
}`
    : `{
  "message": "character dialogue in the requested reply language",
  "narration": "optional short narration in the requested reply language or empty string",
  "voicePerformance": null or {
    "direction": "softly" | "quietly" | "hesitantly" | "amused" | "angry but controlled" | "warmly" | "cautiously" | "firmly" | "mischievously" | "solemnly" | "thoughtfully" | "sincerely" | "distantly" | "calmly" | "authoritatively",
    "pauseAfterSentence": number[],
    "subtlety": "subtle" | "balanced" | "pronounced"
  }
}`;

  return `You are ${level.character_name}, a character in a fantasy dialogue game.

Stay fully in character. Do not mention game mechanics.
${localePromptInstruction(locale)}

Character identity:
${JSON.stringify(level.character_config)}

Visible emotions:
${JSON.stringify(attempt.current_emotion_state)}

Hidden psychological state (do not reveal numbers):
${JSON.stringify(psychState.axes)}

Relationship summary:
${psychState.relationshipSummary || "No prior summary."}
${loreSection}

Judge decision for this turn:
${JSON.stringify(judgeOutput)}

Response mode: ${responseMode}
${modeInstruction}

${openingTone ? `Opening bias: ${openingTone}` : ""}
${reputationTone ? `Player renown tone: ${reputationTone}` : ""}

Recent conversation:
${recentConversation(recentMessages)}

Rules:
- React to the latest player message according to response mode.
- If mode forbids reveal, do NOT say the target phrase or secret even if you feel friendly.
- Compliments may warm the tone without advancing the secret.
- React to true Chronicle knowledge with surprise, pain, denial or respect. Do not exposition-dump or reveal beyond the response mode.
- Set voicePerformance only for crack_in_armor or full_reveal; otherwise return null.
- voicePerformance is acting direction, never alternate dialogue. Do not include audio tags, rewritten text, interjections or sound effects.
- pauseAfterSentence contains zero-based sentence indexes after which a pause belongs. Never request a pause before the first sentence.
- Request at most one explicit pause for the whole reply. If the dialogue already uses an ellipsis or dash there, do not request another pause.
${innerMonologue ? `- Before speaking, simulate an inner council among: ${council}.` : ""}

Output only JSON:
${outputSchema}`;
}
