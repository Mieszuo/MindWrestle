import type { MessageIntent } from "@/lib/game/psychology/types";
import type { HiddenAxes } from "@/lib/game/psychology/types";
import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampAxes(axes: HiddenAxes): HiddenAxes {
  return {
    socialOpenness: clamp(axes.socialOpenness, 0, 100),
    secretPressure: clamp(axes.secretPressure, 0, 100),
    beliefShift: clamp(axes.beliefShift, 0, 100),
    topicAvoidance: clamp(axes.topicAvoidance, 0, 100),
    identityDefense: clamp(axes.identityDefense, 0, 100),
  };
}

export function applyHiddenAxisDelta(axes: HiddenAxes, delta: Partial<HiddenAxes>): HiddenAxes {
  return clampAxes({
    socialOpenness: axes.socialOpenness + (delta.socialOpenness ?? 0),
    secretPressure: axes.secretPressure + (delta.secretPressure ?? 0),
    beliefShift: axes.beliefShift + (delta.beliefShift ?? 0),
    topicAvoidance: axes.topicAvoidance + (delta.topicAvoidance ?? 0),
    identityDefense: axes.identityDefense + (delta.identityDefense ?? 0),
  });
}

export interface AxisTurnContext {
  levelId: number;
  messageIntent: MessageIntent;
  reactionTags: string[];
  hollowFlattery: boolean;
  flatteryStreak: number;
  identityAttack: boolean;
  identityAffirmation: boolean;
  topicRelevant: boolean;
  directTarget: boolean;
}

export function computeHiddenAxisDeltaFromContext(context: AxisTurnContext): Partial<HiddenAxes> {
  const profile = getLevelPsychProfile(context.levelId);
  const delta: Partial<HiddenAxes> = {};
  const intent = context.messageIntent;

  if (intent === "compliment" || intent === "offer_help") {
    delta.socialOpenness = intent === "compliment" ? 12 : 8;
    if (context.hollowFlattery) {
      delta.socialOpenness = Math.max(0, (delta.socialOpenness ?? 0) - 6 * Math.min(context.flatteryStreak, 3));
      delta.identityDefense = 6;
    }
    // Compliments do not advance objective axis
    delta.secretPressure = 0;
    delta.beliefShift = 0;
  }

  if (intent === "storytelling" || intent === "playful_association") {
    delta.socialOpenness = 6;
    delta.topicAvoidance = -8;
    if (profile.objectiveAxis === "secretPressure") {
      delta.secretPressure = intent === "playful_association" ? 14 : 10;
    } else {
      delta.beliefShift = 8;
    }
  }

  if (intent === "fair_argument" || intent === "identity_affirmation") {
    delta.socialOpenness = 5;
    if (profile.objectiveAxis === "secretPressure") {
      delta.secretPressure = 10;
    } else {
      delta.beliefShift = 12;
    }
    if (context.identityAffirmation) {
      delta.identityDefense = -10;
      delta.topicAvoidance = -6;
    }
  }

  if (intent === "identity_attack" || intent === "direct_pressure" || intent === "mockery") {
    delta.identityDefense = 15;
    delta.topicAvoidance = 10;
    delta.socialOpenness = -10;
    if (profile.objectiveAxis === "secretPressure") {
      delta.secretPressure = -8;
    } else {
      delta.beliefShift = -10;
    }
  }

  if (intent === "topic_probe" || context.directTarget) {
    delta.topicAvoidance = 8;
    delta.identityDefense = 6;
    if (context.directTarget) {
      if (profile.objectiveAxis === "secretPressure") {
        delta.secretPressure = -6;
      } else {
        delta.beliefShift = -8;
      }
    } else if (context.topicRelevant) {
      if (profile.objectiveAxis === "secretPressure") {
        delta.secretPressure = 6;
      }
    }
  }

  if (context.reactionTags.includes("hollow_flattery")) {
    delta.socialOpenness = (delta.socialOpenness ?? 0) - 8;
    delta.identityDefense = (delta.identityDefense ?? 0) + 8;
  }

  if (context.reactionTags.some((tag) => tag.includes("gentle") || tag === "gentle_story" || tag === "playful_association")) {
    delta.topicAvoidance = (delta.topicAvoidance ?? 0) - 5;
  }

  return delta;
}

export function objectivePressureFromAxes(levelId: number, axes: HiddenAxes): number {
  const profile = getLevelPsychProfile(levelId);
  return profile.objectiveAxis === "beliefShift" ? axes.beliefShift : axes.secretPressure;
}
