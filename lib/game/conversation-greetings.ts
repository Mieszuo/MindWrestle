import { formatRumorForDisplay, isSameCharacterEvent } from "@/lib/game/reputation";
import type { PlayerReputation } from "@/lib/game/reputation";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export function declineCharacterNameWithZ(name: string): string {
  const trimmed = name.trim();
  if (/dziecko mila/i.test(trimmed)) {
    return "Dzieckiem Milą";
  }
  if (/mila/i.test(trimmed)) {
    return "Milą";
  }
  if (/chytry handlarz/i.test(trimmed)) {
    return "Chytrym Handlarzem";
  }
  if (/dumny rycerz/i.test(trimmed)) {
    return "Dumnym Rycerzem";
  }
  if (/uparty ork/i.test(trimmed)) {
    return "Upartym Orkiem";
  }
  if (/jasny mędrzec/i.test(trimmed)) {
    return "Jasnym Mędrcem";
  }
  if (/wspaniały król/i.test(trimmed)) {
    return "Wspaniałym Królem";
  }
  if (trimmed.endsWith("a")) {
    return trimmed.slice(0, -1) + "ą";
  }
  return trimmed;
}

export function getConversationGreeting(
  levelId: number,
  reputation?: PlayerReputation,
  locale: Locale = "pl",
): string | null {
  const greetings = getDictionary(locale).content.greetings;
  const levelKey = String(levelId) as keyof typeof greetings.byLevel;
  const base = greetings.byLevel[levelKey];
  if (!base) return null;
  if (!reputation) return base;

  const lowCallback = greetings.lowRenownCallbacks[levelKey as keyof typeof greetings.lowRenownCallbacks];
  if (reputation.renown <= 35 && lowCallback) {
    return `${base}${lowCallback}`;
  }

  const highCallback = greetings.highRenownCallbacks[levelKey as keyof typeof greetings.highRenownCallbacks];
  if (reputation.renown >= 70 && highCallback) {
    return `${base}${highCallback}`;
  }

  if (
    reputation.lastIncident &&
    levelId >= 3 &&
    !isSameCharacterEvent(reputation.lastIncident, levelId)
  ) {
    if (locale === "pl") {
      const name = declineCharacterNameWithZ(reputation.lastIncident.characterName);
      return `${base} Plotka o twoim spotkaniu z ${name} dotarła tu wcześniej.`;
    }
    return `${base} A rumor about your meeting with ${reputation.lastIncident.characterName} reached here.`;
  }

  if (
    reputation.lastPraise &&
    levelId >= 3 &&
    reputation.renown >= 55 &&
    !isSameCharacterEvent(reputation.lastPraise, levelId)
  ) {
    if (locale === "pl") {
      const rumorLine = formatRumorForDisplay(
        `Plotka: ${reputation.lastPraise.characterName} wspomina cię dobrze.`,
      );
      return `${base} ${rumorLine}`;
    }
    return `${base} ${reputation.lastPraise.characterName} speaks well of you.`;
  }

  return base;
}

export function reputationToneForPrompt(reputation: PlayerReputation): string {
  if (reputation.renown <= 30) {
    return "The player has low renown. Start guarded, skeptical, and harder to impress.";
  }
  if (reputation.renown >= 75) {
    return "The player has high renown. Start with slight openness or curiosity, but still in character.";
  }
  return "The player has average renown. React normally according to character profile.";
}
