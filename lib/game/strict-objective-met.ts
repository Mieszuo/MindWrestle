import {
  isPriceNegotiation,
  negotiatedPriceMet,
  revealKeywordsMet,
} from "@/lib/game/objective-completion-helpers";
import { milaConcessionMet } from "@/lib/game/mila-concession";
import { kingAgreementMet } from "@/lib/game/king-agreement";
import { containsTargetPhrase } from "@/lib/game/objectives";

export interface StrictObjectiveInput {
  levelId: number;
  objectiveType: string;
  objectiveConfig: Record<string, unknown>;
  characterConfig?: unknown;
  characterMessage: string;
  recentContext: string;
}

export interface StrictObjectiveResult {
  objectiveMet: boolean;
  reason: string;
}

function lower(text: string) {
  return text.toLowerCase();
}

function variantsMet(message: string, objectiveConfig: Record<string, unknown>, key: string): boolean {
  const variants = Array.isArray(objectiveConfig[key])
    ? objectiveConfig[key].filter((entry): entry is string => typeof entry === "string")
    : [];
  if (!variants.length) return false;
  const reply = lower(message);
  return variants.some((variant) => reply.includes(variant.toLowerCase()));
}

function knightConcessionMet(message: string): boolean {
  const reply = lower(message);
  return (
    /(potrzebuj[eę]|musz[eę]|prosz[eę]|przyznam|przyznaj[eę]).{0,40}pomoc/.test(reply) ||
    /pomoc.{0,40}(potrzeb|nie obejdzie|obowi[aą]zk|honor)/.test(reply) ||
    /obowi[aą]zek.{0,30}(wymaga|każe|zobowi[aą]zuje)/.test(reply)
  );
}

function orcAgreementMet(message: string): boolean {
  const reply = lower(message);
  const ceasefire =
    /(rozej|zawiesz|koniec walki|koniec bij|przestan|przerw).{0,30}(młot|walk|bij|wojn)/.test(reply) ||
    /(młot|broń).{0,25}(odło|złoż|kład|nie podnios)/.test(reply) ||
    /(odło|złoż).{0,20}(młot|broń)/.test(reply);
  const dealLanguage = /(zgoda|umowa|rozmow|dogad|pogad)/.test(reply);
  return ceasefire || (dealLanguage && /(młot|walk|bij|rozej|pokój)/.test(reply));
}

function godConcessionMet(message: string): boolean {
  const reply = lower(message);
  const vagueOnly =
    /(może|czasem|kiedyś|trudno powiedzieć|nie wszystko wiadomo)/.test(reply) &&
    !/(prawd[aą]|tajemn|ukryw|świat|wszechświat|rzeczywisto)/.test(reply);
  if (vagueOnly) return false;

  return (
    /prawda.{0,20}(świat|świecie|wszechświat|rzeczywisto)/.test(reply) ||
    /(prawd[aą]|tajemn).{0,40}(świat|świecie|wszechświat|rzeczywisto|istnien)/.test(reply) ||
    /(świat|świecie|wszechświat).{0,40}(prawd|tajemn|inaczej|nie taki)/.test(reply) ||
    /(ukryw|nie mówi).{0,30}(wam|ludziom|świat)/.test(reply)
  );
}

/**
 * Deterministic objective completion — single source of truth for mock judge and AI veto.
 */
export function evaluateStrictObjectiveMet(input: StrictObjectiveInput): StrictObjectiveResult {
  const { levelId, objectiveType, objectiveConfig, characterConfig, characterMessage, recentContext } =
    input;

  if (objectiveType === "TARGET_UTTERANCE") {
    const met = containsTargetPhrase(characterMessage, objectiveConfig);
    return { objectiveMet: met, reason: met ? "Target phrase spoken." : "Target phrase missing." };
  }

  if (isPriceNegotiation(objectiveConfig)) {
    const met = negotiatedPriceMet(characterMessage, objectiveConfig);
    return { objectiveMet: met, reason: met ? "Deal at or below target price." : "No acceptable final price." };
  }

  if (objectiveType === "SECRET_REVEAL") {
    const minMatches = levelId === 5 ? 2 : 1;
    const met = revealKeywordsMet(characterMessage, objectiveConfig, characterConfig, { minMatches });
    return { objectiveMet: met, reason: met ? "Reveal keywords present." : "Reveal keywords missing." };
  }

  if (levelId === 1 && objectiveType === "CONCESSION") {
    const met = milaConcessionMet(characterMessage, recentContext);
    return {
      objectiveMet: met,
      reason: met ? "Mila conceded about the orchard." : "No orchard concession in reply.",
    };
  }

  if (levelId === 3 && objectiveType === "CONCESSION") {
    const met = knightConcessionMet(characterMessage);
    return {
      objectiveMet: met,
      reason: met ? "Knight admitted needing help." : "No admission of needing help.",
    };
  }

  if (levelId === 4 && objectiveType === "AGREEMENT") {
    const met = orcAgreementMet(characterMessage);
    return {
      objectiveMet: met,
      reason: met ? "Orc agreed to cease fighting." : "No ceasefire or hammer agreement.",
    };
  }

  if (levelId === 6 && objectiveType === "AGREEMENT") {
    const met = kingAgreementMet(characterMessage);
    return {
      objectiveMet: met,
      reason: met ? "King agreed to open the gate." : "No gate-opening agreement.",
    };
  }

  if (levelId === 7 && objectiveType === "CONCESSION") {
    const met = godConcessionMet(characterMessage);
    return {
      objectiveMet: met,
      reason: met ? "God revealed truth about the world." : "No truth concession about the world.",
    };
  }

  if (variantsMet(characterMessage, objectiveConfig, "acceptedConcessionVariants")) {
    return { objectiveMet: true, reason: "Accepted concession variant matched." };
  }

  if (variantsMet(characterMessage, objectiveConfig, "acceptedAgreementVariants")) {
    return { objectiveMet: true, reason: "Accepted agreement variant matched." };
  }

  return {
    objectiveMet: false,
    reason: `No strict match for level ${levelId} / ${objectiveType}.`,
  };
}
