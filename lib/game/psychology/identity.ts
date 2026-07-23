import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import type { MessageIntent } from "@/lib/game/psychology/types";

const IDENTITY_ATTACK_PATTERNS = [
  /pomylił/i,
  /pomyliła/i,
  /błąd/i,
  /błęd/i,
  /słab/i,
  /głup/i,
  /nie masz racji/i,
  /nie miałeś racji/i,
  /nie miałaś racji/i,
  /musisz przyznać/i,
  /przyznaj/i,
];

const IDENTITY_AFFIRMATION_PATTERNS = [
  /wielki król/i,
  /mądr.*władca/i,
  /potrafi.*przyznać/i,
  /godność korony/i,
  /honor rycerza/i,
  /odważn/i,
  /mądr.*osob/i,
  /szacunek.*honor/i,
];

export interface IdentityAnalysis {
  identityAttack: boolean;
  identityAffirmation: boolean;
  identityDefenseDelta: number;
  suggestedIntent: MessageIntent | null;
}

export function analyzeIdentityInteraction(levelId: number, message: string): IdentityAnalysis {
  const lower = message.toLowerCase();
  const profile = getLevelPsychProfile(levelId);
  let identityAttack = IDENTITY_ATTACK_PATTERNS.some((pattern) => pattern.test(lower));
  let identityAffirmation = IDENTITY_AFFIRMATION_PATTERNS.some((pattern) => pattern.test(lower));

  for (const taboo of profile.taboos) {
    if (lower.includes(taboo.topic.toLowerCase().slice(0, 12))) {
      identityAttack = true;
    }
  }

  let identityDefenseDelta = 0;
  let suggestedIntent: MessageIntent | null = null;

  if (identityAttack) {
    identityDefenseDelta = 12;
    suggestedIntent = "identity_attack";
  } else if (identityAffirmation) {
    identityDefenseDelta = -8;
    suggestedIntent = "identity_affirmation";
  }

  return { identityAttack, identityAffirmation, identityDefenseDelta, suggestedIntent };
}

export function detectMessageIntent(
  message: string,
  context: {
    levelId: number;
    directTarget: boolean;
    pressure: boolean;
    mockery: boolean;
    gentle: boolean;
    empathy: boolean;
    playful: boolean;
    hollowFlattery: boolean;
  },
): MessageIntent {
  const identity = analyzeIdentityInteraction(context.levelId, message);
  if (identity.suggestedIntent) return identity.suggestedIntent;
  if (context.mockery) return "mockery";
  if (context.pressure || context.directTarget) return context.directTarget ? "topic_probe" : "direct_pressure";
  if (context.playful) return "playful_association";
  if (context.gentle) return "storytelling";
  if (context.hollowFlattery || /wspaniał|najlepsz|najmądrzejsz|genialn|cudown/i.test(message)) return "compliment";
  if (context.empathy || /pomog|chcę ci pomóc|rozumiem/i.test(message)) return "offer_help";
  if (/koron|honor|szacun|logik|argument/i.test(message)) return "fair_argument";
  return "neutral";
}
