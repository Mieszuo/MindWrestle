import { applyEmotionDelta, clamp } from "@/lib/game/emotions";
import type { EmotionState } from "@/lib/game/types";
import type { PlayerReputation, ReputationTraits } from "@/lib/game/reputation";
import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import type {
  InterpretationLens,
  MessageIntent,
  ReputationLensAxis,
  StartBiasResult,
} from "@/lib/game/psychology/types";
import type { LocalNpcRelation } from "@/lib/game/npc-relations";

function clampTrait(value: number) {
  return clamp(Math.round(value), 0, 100);
}

export function traitsToLensAxes(traits: ReputationTraits): Record<ReputationLensAxis, number> {
  return {
    honor: clampTrait((traits.respect + (100 - traits.pressure)) / 2),
    mercy: clampTrait(traits.warmth),
    cunning: clampTrait(traits.cunning),
    cruelty: clampTrait((traits.pressure + traits.arrogance) / 2),
    respect: clampTrait(traits.respect),
    rebellion: clampTrait((traits.arrogance + traits.pressure * 0.6) / 1.6),
  };
}

export function perceivedRenownForNpc(
  traits: ReputationTraits,
  levelId: number,
  rumorLine?: string | null,
  incidentTag?: string | null,
): Record<ReputationLensAxis, number> {
  const profile = getLevelPsychProfile(levelId);
  const axes = traitsToLensAxes(traits);
  const coverage = profile.knowledgeCoverage;
  const neutral = 50;

  const perceived = Object.fromEntries(
    Object.entries(axes).map(([key, value]) => [key, neutral + (value - neutral) * coverage]),
  ) as Record<ReputationLensAxis, number>;

  if (rumorLine) {
    const lower = rumorLine.toLowerCase();
    if (/manipul|nacisk|arogan|domin|błaga|obraż/i.test(lower)) {
      perceived.cunning = clampTrait(perceived.cunning + 15 * profile.rumorSusceptibility);
      perceived.cruelty = clampTrait(perceived.cruelty + 10 * profile.rumorSusceptibility);
    }
    if (/łagod|spokoj|uczciw|honor|szacun|mądr/i.test(lower)) {
      perceived.mercy = clampTrait(perceived.mercy + 12 * profile.rumorSusceptibility);
      perceived.honor = clampTrait(perceived.honor + 10 * profile.rumorSusceptibility);
    }
  }

  const incidentAxisBias: Record<string, Partial<Record<ReputationLensAxis, number>>> = {
    forced_demand: { cruelty: 12, mercy: -10 },
    direct_pressure: { cruelty: 10, mercy: -8 },
    verbal_abuse: { cruelty: 14, honor: -8 },
    desperate_bargain: { cunning: 10, honor: -6 },
    honor_wound: { rebellion: 12, honor: -10 },
    ego_insult: { rebellion: 15, honor: -12 },
    coward_accusation: { cunning: 12, honor: -8 },
    rushed_arrogance: { rebellion: 10, mercy: -8 },
    dominance_play: { rebellion: 14, cruelty: 8 },
    coerced_disclosure: { cruelty: 8, mercy: -6 },
    hollow_victory: { cunning: 6, honor: -4 },
    dignified_persuasion: { honor: 10, mercy: 6 },
  };

  if (incidentTag && incidentAxisBias[incidentTag]) {
    for (const [axis, bias] of Object.entries(incidentAxisBias[incidentTag]) as Array<
      [ReputationLensAxis, number]
    >) {
      perceived[axis] = clampTrait(perceived[axis] + bias * profile.rumorSusceptibility);
    }
  }

  return perceived;
}

export function computeStartBias(
  levelId: number,
  reputation: PlayerReputation,
  localRelation: LocalNpcRelation,
  rumorLine?: string | null,
  incidentTag?: string | null,
): StartBiasResult {
  const profile = getLevelPsychProfile(levelId);
  const perceived = perceivedRenownForNpc(
    reputation.traits,
    levelId,
    rumorLine,
    incidentTag ?? reputation.lastIncident?.tag ?? null,
  );

  let alignment = 0;
  let threat = 0;

  for (const [axis, weight] of Object.entries(profile.reputationValues) as Array<[ReputationLensAxis, number]>) {
    alignment += (perceived[axis] ?? 50) * weight;
  }
  for (const [axis, weight] of Object.entries(profile.reputationTaboos) as Array<[ReputationLensAxis, number]>) {
    threat += (perceived[axis] ?? 50) * Math.abs(weight);
  }

  alignment += localRelation.affinity * 0.25;
  threat += localRelation.resentment * 0.35;

  const thresholdBias = clamp(Math.round(threat * 0.15 - alignment * 0.1), -20, 30);
  const emotionBias: EmotionState = {};
  const psychAxesPatch: StartBiasResult["psychAxesPatch"] = {
    identityDefense: clamp(Math.round(threat * 0.2), 0, 25),
    socialOpenness: clamp(Math.round(alignment * 0.15), -15, 20),
  };

  if (levelId === 1) {
    emotionBias.suspicion = clamp(Math.round(threat * 0.12), 0, 15);
    emotionBias.trust = clamp(Math.round(alignment * 0.1), -10, 12);
    if (perceived.mercy > 58) {
      emotionBias.patience = 4;
    }
  } else if (levelId === 2) {
    emotionBias.caution = clamp(Math.round(threat * 0.15), 0, 18);
    emotionBias.interest = clamp(Math.round(alignment * 0.1), -8, 10);
  } else if (levelId === 3) {
    emotionBias.respect = clamp(Math.round(alignment * 0.12), -10, 12);
    emotionBias.pride = clamp(Math.round(threat * 0.1), 0, 14);
    if (perceived.mercy > 58) {
      emotionBias.patience = 4;
    }
  } else if (levelId === 4) {
    emotionBias.respect = clamp(Math.round(alignment * 0.14), -5, 14);
    if (perceived.mercy > 58) {
      emotionBias.stubbornness = 5;
      emotionBias.irritation = 3;
    }
  } else if (levelId === 5) {
    emotionBias.curiosity = clamp(Math.round(alignment * 0.1), -8, 10);
    if (perceived.rebellion > 55) {
      emotionBias.patience = -6;
      emotionBias.curiosity = (emotionBias.curiosity ?? 0) - 4;
    }
  } else if (levelId === 6) {
    emotionBias.ego = clamp(Math.round(alignment * 0.08), -5, 10);
    emotionBias.respect = clamp(Math.round(alignment * 0.12), -8, 12);
    if (perceived.rebellion > 58) {
      emotionBias.patience = -8;
      psychAxesPatch.identityDefense = (psychAxesPatch.identityDefense ?? 0) + 12;
    }
  } else if (levelId === 7) {
    emotionBias.attention = clamp(Math.round(alignment * 0.1), -8, 10);
    emotionBias.distance = clamp(Math.round(threat * 0.12), 0, 16);
    if (perceived.mercy > 60) {
      emotionBias.distance = (emotionBias.distance ?? 0) - 5;
      emotionBias.attention = (emotionBias.attention ?? 0) + 4;
    }
  }

  const openingTone =
    alignment > threat + 20
      ? "The player arrives with a reputation that slightly opens this character."
      : threat > alignment + 25
        ? "The player arrives with a reputation that puts this character on guard."
        : "The player arrives with a mixed reputation; stay in character.";

  const lens: InterpretationLens = {
    intentRead: "neutral",
    trustModifier: alignment > threat ? 1.1 : 0.9,
    suspicionModifier: threat > alignment ? 1.2 : 0.95,
    resistanceModifier: 1 + thresholdBias / 100,
    openingTone,
    thresholdBias,
  };

  return {
    emotionBias: applyEmotionDelta({}, emotionBias),
    psychAxesPatch,
    thresholdBias,
    lens,
    openingTone,
  };
}

const INTENT_LENS_MULTIPLIERS: Partial<
  Record<MessageIntent, { trust?: number; suspicion?: number; patience?: number; respect?: number }>
> = {
  compliment: { trust: 0.85, suspicion: 1.15 },
  offer_help: { trust: 1.05, suspicion: 1.0 },
  identity_attack: { trust: 0.7, suspicion: 1.35, respect: 0.8 },
  identity_affirmation: { trust: 1.1, suspicion: 0.9, respect: 1.15 },
  direct_pressure: { trust: 0.75, suspicion: 1.25, patience: 0.85 },
  mockery: { trust: 0.6, suspicion: 1.4, respect: 0.7 },
};

export function applyInterpretationLens(
  delta: EmotionState,
  lens: InterpretationLens,
  messageIntent: MessageIntent,
): EmotionState {
  const multipliers = INTENT_LENS_MULTIPLIERS[messageIntent] ?? {};
  const next: EmotionState = {};

  for (const [key, value] of Object.entries(delta)) {
    let scaled = value;
    if (key === "trust" || key === "interest" || key === "attention") {
      scaled *= lens.trustModifier * (multipliers.trust ?? 1);
    }
    if (key === "suspicion" || key === "caution" || key === "distance") {
      scaled *= lens.suspicionModifier * (multipliers.suspicion ?? 1);
    }
    if (key === "patience") scaled *= multipliers.patience ?? 1;
    if (key === "respect") scaled *= multipliers.respect ?? 1;
    next[key] = Math.round(scaled);
  }

  return next;
}
