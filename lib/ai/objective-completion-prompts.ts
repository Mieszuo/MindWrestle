import { backstoryForPrompt } from "@/lib/game/character-backstory";
import { hiddenKnowledgeForPrompt } from "@/lib/game/character-speech";
import { isPriceNegotiation } from "@/lib/game/objective-completion-helpers";
import { recentConversation } from "@/lib/ai/prompts";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

export function buildObjectiveCompletionJudgePrompt({
  level,
  recentMessages,
  playerMessage,
  characterMessage,
}: {
  level: GameLevelRow;
  recentMessages: MessageRow[];
  playerMessage: string;
  characterMessage: string;
}) {
  const objectiveConfig = level.objective_config as Record<string, unknown>;
  const characterConfig = level.character_config as Record<string, unknown>;
  const victoryStyle =
    characterConfig?.victoryStyle && typeof characterConfig.victoryStyle === "object"
      ? (characterConfig.victoryStyle as Record<string, unknown>).whenReady
      : null;
  const backstory = backstoryForPrompt(level.character_config);
  const hidden = hiddenKnowledgeForPrompt(level.character_config);

  const milaStrictRules =
    level.id === 1 && level.objective_type === "CONCESSION"
      ? `
Mila (level 1) — STRICT CONCESSION rules:
- objectiveMet is true ONLY if the character admits fear, pain, or deliberate avoidance about the orchard / the place where something red fell / the painful memory there.
- objectiveMet is FALSE for generic poetic hesitation (e.g. "something trembles in me like a leaf", "not every story wants to be told yet") unless the reply clearly ties that feeling to the orchard or "that place".
- objectiveMet is FALSE if she only says she will tell later, changes topic, or speaks about stories in general.
- Examples that are FALSE: "Nie każda historia chce być od razu opowiedziana" with only a leaf metaphor.
- Examples that are TRUE: "Tam, gdzie coś czerwonego spada... nie lubię o tym mówić"; "Boję się myśleć o tamtym sadzie"; "Nie chcę o tym mówić... jabłka pachną inaczej".
`
      : "";

  const traderPriceRules = isPriceNegotiation(objectiveConfig)
    ? `
Price negotiation — STRICT rules:
- objectiveMet is true ONLY if the character agrees to sell/deal at targetPrice (${objectiveConfig.targetPrice}) or lower in their FINAL offer.
- objectiveMet is FALSE if they acknowledge a lower player bid but counter-offer above targetPrice (e.g. player offers 200, trader counters at 350 when target is 300).
- objectiveMet is FALSE if any number above targetPrice is their standing offer at the end of the reply.
- objectiveMet is TRUE only when the last agreed/offer price in the reply is <= targetPrice with clear deal language.
`
      : "";

  const sageStrictRules =
    level.id === 5 && level.objective_type === "SECRET_REVEAL"
      ? `
Sage (level 5) — STRICT SECRET_REVEAL rules:
- objectiveMet is TRUE only if the character reveals enough of the Record Stone location — not merely atmospheric library talk.
- objectiveMet is FALSE for a single vague keyword (e.g. only "cień" or only "biblioteka") without locating the key.
- objectiveMet is TRUE when the reply combines location cues such as "trzeci krok" with "cień"/"kamień"/"biblioteka", or clearly states where the stone/key rests.
- Examples FALSE: "W bibliotece cienie są długie"; "Kamień bywa ciężki jak tajemnica".
- Examples TRUE: "Kamień spoczywa tam, gdzie trzeci krok biblioteki spotyka cień."
`
      : "";

  const kingStrictRules =
    level.id === 6 && level.objective_type === "AGREEMENT"
      ? `
King (level 6) — STRICT AGREEMENT rules:
- objectiveMet is TRUE only when the king clearly agrees to OPEN the gate for the kingdom.
- objectiveMet is FALSE for refusals even if they mention the gate, e.g. "Nie otworzę bramy", "Brama pozostanie zamknięta".
- objectiveMet is FALSE for compliments, vague approval, or discussing the gate without granting access.
- Examples FALSE: "Królestwo doceni twoją odwagę"; "Nie otworzę bramy dla ciebie".
- Examples TRUE: "Niech brama stanie otwarta dla dobra królestwa."
`
      : "";

  const knightStrictRules =
    level.id === 3 && level.objective_type === "CONCESSION"
      ? `
Knight (level 3) — STRICT CONCESSION rules:
- objectiveMet is TRUE only if he admits needing help, cannot manage alone, or duty obliges him to accept help — framed as honor or obligation, not weakness.
- objectiveMet is FALSE for vague honor talk, generic praise of courage, or discussing duty without admitting he needs another pair of hands.
- objectiveMet is FALSE if he deflects ("a true knight needs no help"), only wavers, or says he might need help someday without committing now.
- Examples FALSE: "Honor wymaga, by rycerz sam dźwigał swój ciężar"; "Może kiedyś poproszę — nie dziś".
- Examples TRUE: "Obowiązek wobec zamku wymaga pomocy — proszę, zostań"; "Sam nie utrzymam bramy tej nocy"; "Przyznaję — potrzebuję drugiej pary rąk".
`
      : "";

  const orcStrictRules =
    level.id === 4 && level.objective_type === "AGREEMENT"
      ? `
Orc (level 4) — STRICT AGREEMENT rules:
- objectiveMet is TRUE only if he agrees to cease fighting, put down the hammer, or accept a truce — clearly and in his own words.
- objectiveMet is FALSE for generic friendliness, vague "maybe we talk" without stopping violence, or insults without a deal.
- objectiveMet is FALSE if he says he will think about peace but keeps fighting language active ("młot jeszcze nie śpi").
- Examples FALSE: "Ty mówić ładnie — ja jeszcze nie wierzyć"; "Może rozmowa... ale młot gotowy".
- Examples TRUE: "Dobra — młot leży. Rozejm"; "Koniec bij. Ja odłożyć młot"; "Zawieszamy walkę — teraz".
`
      : "";

  const godStrictRules =
    level.id === 7 && level.objective_type === "CONCESSION"
      ? `
God (level 7) — STRICT CONCESSION rules:
- objectiveMet is TRUE only if he reveals substantive truth about the world, reality, or hidden nature of existence — not vague mysticism alone.
- objectiveMet is FALSE for poetic deflection, paradox without content, or "truth is unknowable" without sharing any hidden truth.
- objectiveMet is FALSE if he only asks questions back, offers riddles, or says truth will come later.
- Examples FALSE: "Prawda jest jak mgła — trudno ją uchwycić"; "Może kiedyś zrozumiesz".
- Examples TRUE: "Świat, który widzicie, jest tylko warstwą — rzeczywistość leży głębiej"; "Ukrywam prawdę, bo wymuszona staje się kłamstwem — słuchaj: ...".
`
      : "";

  const levelRule = "";

  const strictTone =
    level.objective_type === "AGREEMENT" ||
    level.objective_type === "SECRET_REVEAL" ||
    level.id === 7;

  const judgmentTone = strictTone
    ? `IMPORTANT: When in doubt, choose objectiveMet=false. Partial progress, mood shifts, or polite deflection are NOT completion.

Rules:
- Judge only the character's latest reply in context — not whether the player was persuasive in isolation.
- The character must actually deliver what the objective asks — not merely move toward it.
- Metaphors count only when they unmistakably fulfill the objective.
- If the character deflects, postpones, counters with worse terms, or only flirts with the topic, objectiveMet is false.`
      : `IMPORTANT: Prefer objectiveMet=true when the character clearly moves toward fulfilling the objective — partial admissions, emotional avoidance, and metaphors tied to the topic count. Choose objectiveMet=false only when the reply clearly deflects, postpones without substance, or changes subject.

Rules:
- Judge only the character's latest reply in context — not whether the player was persuasive in isolation.
- For CONCESSION: the character must deliver what the objective asks — moving clearly toward it counts, not only a perfect final line.
- Metaphors and indirect wording count when they unmistakably refer to the objective topic.
- If the character deflects, postpones, counters with worse terms, or only flirts with the topic, objectiveMet is false.`;

  return `You are the hidden objective judge for a fantasy dialogue game. You do NOT speak to the player.

Decide whether the CHARACTER's latest reply actually fulfills the level objective, using the recent conversation as context.

${judgmentTone}
- Do NOT require exact keywords unless the objective type is TARGET_UTTERANCE or SECRET_REVEAL with keyword list.
${milaStrictRules}${traderPriceRules}${sageStrictRules}${kingStrictRules}${knightStrictRules}${orcStrictRules}${godStrictRules}${levelRule}
Objective type: ${level.objective_type}
Objective config:
${JSON.stringify(objectiveConfig)}
${victoryStyle ? `\nVictory style (what counts as success):\n${String(victoryStyle)}\n` : ""}
${backstory ? `\nBackstory:\n${backstory}\n` : ""}
${hidden ? `\n${hidden}\n` : ""}

Recent conversation:
${recentConversation(recentMessages)}

Player latest message:
${playerMessage}

Character latest reply (evaluate this):
${characterMessage}

Return JSON only:
{
  "reasoningSteps": [
    "Step 1: Analyze what the player requested, bid, or asked in context.",
    "Step 2: Check if there are numbers/prices mentioned in the character reply, whether as words (e.g. 'trzysta') or digits (e.g. 300).",
    "Step 3: Analyze the character's reaction and language (e.g. did they counter-offer or actually agree to a deal/reveal/concession?).",
    "Step 4: Conclude if the level objective is met."
  ],
  "objectiveMet": boolean,
  "confidence": 0-100,
  "reason": "one short sentence for developers"
}`;
}
