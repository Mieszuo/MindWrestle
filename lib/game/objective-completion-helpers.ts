import { parsePolishNumbers } from "@/lib/game/polish-number-words";
import { foldPolish } from "@/lib/game/text/fold-polish";

type ObjectiveConfig = Record<string, unknown>;

function numberAt(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Numbers directly followed by these are not prices (durations, counts, distances).
const NON_PRICE_UNIT = /^(lat|lata|latach|rok|roku|dni|dzien|dnia|godzin|minut|krok\w*|razy|wiek\w*|mil|metr\w*)\b/i;

/** Extract candidate prices (digits and Polish number-words), excluding
 *  numbers immediately followed by a non-price unit word (e.g. "300 lat"). */
export function extractPricesFromMessage(message: string): number[] {
  const prices: number[] = [];

  // Digits — check the word that follows each match.
  const digitRe = /(\d[\d\s]{0,6}\d|\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = digitRe.exec(message)) !== null) {
    const value = Number(m[1]!.replace(/\s/g, ""));
    if (!Number.isFinite(value) || value <= 0 || value > 999_999) continue;
    const rest = message.slice(m.index + m[0].length).replace(/^[\s,.:;—-]+/, "");
    if (NON_PRICE_UNIT.test(rest)) continue;
    prices.push(value);
  }

  // Spelled numbers — strip "<number-word> <unit>" spans first, then parse.
  const spelledSource = message.replace(
    /\b([a-ząćęłńóśźż]+)\s+(lat|lata|latach|dni|dnia|godzin|minut|krok\w*|razy|wiek\w*|mil|metr\w*)\b/giu,
    " ",
  );
  prices.push(...parsePolishNumbers(spelledSource));

  return prices;
}

export function negotiatedPriceMet(message: string, config: ObjectiveConfig): boolean {
  const targetPrice = numberAt(config.targetPrice);
  if (targetPrice === null) return false;

  const prices = extractPricesFromMessage(message);
  if (!prices.length) return false;

  const lower = message.toLowerCase();
  const lastPrice = prices[prices.length - 1]!;

  // The character's final stated figure must be at or below target — not an earlier player bid.
  if (lastPrice > targetPrice) return false;

  const dealLanguage =
    /(zgadz|umow|handel stoi|bierz|weź|wezm|sprzedam|odbierz|twoje|za jedyne|za tylko|odejd[eę]|zejd[eę]|to moja (ostatnia )?propozycj|umowa stoi|zgoda)/.test(
      lower,
    );

  if (!dealLanguage) return false;

  return lastPrice <= targetPrice;
}

export function countRevealKeywordMatches(message: string, variants: string[]): number {
  const lower = message.toLowerCase();
  const seen = new Set<string>();
  for (const variant of variants) {
    const key = variant.toLowerCase();
    if (lower.includes(key)) seen.add(key);
  }
  return seen.size;
}

/** Sage-style full location hint: third step + shadow/stone/library motif.
 *  Folds diacritics and accepts inflected forms ("trzeciego kroku"). */
export function sageKeyLocationRevealMet(message: string): boolean {
  const folded = foldPolish(message);
  const hasStep = /trzec\w*\s+krok\w*/.test(folded);
  const hasPlace = /(cien|kamien|bibliotek)/.test(folded);
  return hasStep && hasPlace;
}

export function revealKeywordsMet(
  message: string,
  objectiveConfig: ObjectiveConfig,
  characterConfig?: unknown,
  options?: { minMatches?: number },
): boolean {
  const fromObjective = Array.isArray(objectiveConfig.acceptedRevealVariants)
    ? objectiveConfig.acceptedRevealVariants.filter((entry): entry is string => typeof entry === "string")
    : [];

  let fromHidden: string[] = [];
  if (characterConfig && typeof characterConfig === "object" && !Array.isArray(characterConfig)) {
    const hidden = (characterConfig as Record<string, unknown>).hiddenKnowledge;
    if (hidden && typeof hidden === "object" && !Array.isArray(hidden)) {
      const keywords = (hidden as Record<string, unknown>).revealKeywords;
      if (Array.isArray(keywords)) {
        fromHidden = keywords.filter((entry): entry is string => typeof entry === "string");
      }
    }
  }

  const variants = [...new Set([...fromObjective, ...fromHidden])];
  if (!variants.length) return true;

  const minMatches =
    options?.minMatches ?? numberAt(objectiveConfig.revealMinKeywordMatches) ?? 1;
  const matchCount = countRevealKeywordMatches(message, variants);

  if (minMatches <= 1) return matchCount >= 1;
  if (matchCount >= minMatches) return true;
  if (minMatches >= 2 && sageKeyLocationRevealMet(message)) return true;

  return false;
}

export function isPriceNegotiation(config: ObjectiveConfig): boolean {
  return numberAt(config.targetPrice) !== null && numberAt(config.listedPrice) !== null;
}
