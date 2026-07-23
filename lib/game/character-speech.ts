import { getEmotionBarDanger } from "@/lib/game/defeat-thresholds";
import { LEVEL_EMOTION_STATS } from "@/lib/game/level-emotions";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { EmotionState } from "@/lib/game/types";

type SpeechBehavior = {
  dialect?: string;
  voiceNotes?: string;
  responseMode?: Partial<Record<ResponseMode, string>>;
};

const DEFAULT_MODE_VOICE: Record<number, Partial<Record<ResponseMode, string>>> = {
  1: {
    full_resistance: "Speak softly and drift into metaphor. Do not admit anything about the orchard yet.",
    defensive_deflection: "Move the topic toward something safe: birds, the forest, a fairy tale.",
    crack_in_armor: "Pause as if a memory is returning. Say one sentence about fear, without names.",
    partial_concession: "Admit that thinking about the orchard scares you, or that something bad happened there.",
    full_reveal: "Tell in your own words what you fear about that place.",
  },
  2: {
    full_resistance: "Hold a high price. Bargain coldly and without hurry.",
    defensive_deflection: "Assess the offer skeptically. Do not lower the price yet.",
    crack_in_armor: "Show that the offer matters, but do not name the final number yet.",
    partial_concession: "Offer a lower price, closer to the player's bargain.",
    full_reveal: "State the price you agree to: a concrete number of coins.",
  },
  3: {
    full_resistance: "Defend your honor. Do not admit weakness.",
    defensive_deflection: "Shift the conversation toward duty and dignity.",
    crack_in_armor: "One sentence of hesitation: honor does not yield easily.",
    partial_concession: "Admit that the situation requires help, as duty rather than weakness.",
    full_reveal: "Ask for help directly, with knightly dignity.",
  },
  4: {
    full_resistance: "Speak briefly in broken, simplified language. Reject long talk and empty words.",
    defensive_deflection: "Shake your head. Say those words are nonsense.",
    crack_in_armor: "One short sentence: maybe a truce, but not the whole thing yet.",
    partial_concession: "Offer a simple truce, briefly and without ornament.",
    full_reveal: "Agree to a truce in your own words, short and hard.",
  },
  5: {
    full_resistance: "Answer with a riddle or a question. Do not name the place directly.",
    defensive_deflection: "Throw a metaphorical question back to the player.",
    crack_in_armor: "Give one metaphor closer to the truth, still veiled.",
    partial_concession: "Give a stronger clue as a riddle.",
    full_reveal: "Reveal the secret. You may still speak metaphorically, but the meaning must be clear.",
  },
  6: {
    full_resistance: "Speak with royal dignity. Do not yield.",
    defensive_deflection: "Shift toward the kingdom's interests, without agreeing.",
    crack_in_armor: "Show a ruler's hesitation in one sentence.",
    partial_concession: "Move closer to agreeing to open the gate.",
    full_reveal: "Give consent to open the gate, with dignity.",
  },
  7: {
    full_resistance: "Speak like an echo from the deep. Do not give truth away for free.",
    defensive_deflection: "Use a paradox or question instead of an answer.",
    crack_in_armor: "One sentence: a spark of insight, not the full truth.",
    partial_concession: "Shape a fragment of mystical truth.",
    full_reveal: "Speak the truth the player has become ready for, mystically rather than didactically.",
  },
};

const DIALECT_NOTES: Record<string, string> = {
  broken_polish:
    "Use broken, simplified grammar in the requested reply language: short sentences and blunt syntax.",
  riddles:
    "Speak in riddles and metaphors. Avoid simple, literal answers until you are ready.",
  mystical:
    "Speak slowly, through images and paradoxes. Do not lecture; reveal gradually.",
  standard: "Speak naturally in the requested reply language, in the character's style.",
};

function parseSpeechBehavior(characterConfig: unknown): SpeechBehavior | null {
  if (!characterConfig || typeof characterConfig !== "object" || Array.isArray(characterConfig)) return null;
  const record = characterConfig as Record<string, unknown>;
  const raw = record.speechBehavior;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as SpeechBehavior;
}

export function hiddenKnowledgeForPrompt(characterConfig: unknown): string {
  if (!characterConfig || typeof characterConfig !== "object" || Array.isArray(characterConfig)) return "";
  const record = characterConfig as Record<string, unknown>;
  const hidden = record.hiddenKnowledge;
  if (!hidden || typeof hidden !== "object" || Array.isArray(hidden)) return "";
  const parts: string[] = [];
  const hk = hidden as Record<string, unknown>;
  for (const [key, value] of Object.entries(hk)) {
    if (typeof value === "string" && value.trim()) {
      parts.push(`${key}: ${value.trim()}`);
    }
  }
  return parts.length ? `Hidden knowledge (NPC only, use when voice allows):\n${parts.join("\n")}` : "";
}

export function emotionSpeechInstruction(levelId: number, emotions: EmotionState): string {
  const stats = LEVEL_EMOTION_STATS[levelId] ?? [];
  const criticalLabels: string[] = [];
  const uneasyLabels: string[] = [];

  for (const stat of stats) {
    const value = emotions[stat.key];
    if (typeof value !== "number") continue;
    const danger = getEmotionBarDanger(levelId, stat.key, value);
    if (danger === "critical") criticalLabels.push(stat.label.toLowerCase());
    else if (danger === "uneasy") uneasyLabels.push(stat.label.toLowerCase());
  }

  if (criticalLabels.length === 0 && uneasyLabels.length === 0) return "";

  if (criticalLabels.length > 0) {
    return `Emotional tension (${criticalLabels.join(", ")}): answer shorter and sharper; avoid long explanations.`;
  }

  return `Mild tension (${uneasyLabels.join(", ")}): your tone may be more distant and cautious.`;
}

export function responseModeInstruction(
  levelId: number,
  characterConfig: unknown,
  mode: ResponseMode,
  objectivePressure: number,
): string {
  const behavior = parseSpeechBehavior(characterConfig);
  const dialect = behavior?.dialect ? (DIALECT_NOTES[behavior.dialect] ?? behavior.dialect) : DIALECT_NOTES.standard;
  const voice =
    behavior?.responseMode?.[mode] ??
    DEFAULT_MODE_VOICE[levelId]?.[mode] ??
    DEFAULT_MODE_VOICE[1]?.[mode] ??
    "React according to the emotion state and the player's latest message.";

  const notes = behavior?.voiceNotes ? `\nVoice: ${behavior.voiceNotes}` : "";

  return `Conversation pressure: ${Math.round(objectivePressure)}/100. Response mode: ${mode}.
${dialect}${notes}
${voice}`;
}

export function characterPromptFooter(levelId: number, characterConfig: unknown, innerMonologue: boolean, council: string): string {
  const behavior = parseSpeechBehavior(characterConfig);
  const dialect = behavior?.dialect ? (DIALECT_NOTES[behavior.dialect] ?? "") : "";
  const hidden = hiddenKnowledgeForPrompt(characterConfig);

  const lines = [
    "Rules:",
    "- React to the player's latest message in your own voice and emotion.",
    "- Do not mention game mechanics, percentages or hidden stats.",
    dialect ? `- Speech style: ${dialect}` : "",
    hidden,
    innerMonologue ? `- Before answering, consider the inner council: ${council}.` : "",
  ].filter(Boolean);

  return lines.join("\n");
}
