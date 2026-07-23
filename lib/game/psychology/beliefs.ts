import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import type { Belief, MessageIntent, PsychState } from "@/lib/game/psychology/types";

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ensureBeliefs(state: PsychState, levelId: number): Belief[] {
  if (state.beliefs.length) {
    return state.beliefs.map((belief) => ({ ...belief }));
  }
  return getLevelPsychProfile(levelId).beliefs.map((belief) => ({ ...belief }));
}

export function updateBeliefs(
  beliefs: Belief[],
  context: {
    messageIntent: MessageIntent;
    identityAttack: boolean;
    identityAffirmation: boolean;
    concessionLikely: boolean;
  },
): Belief[] {
  return beliefs.map((belief) => {
    let confidence = belief.confidence;
    const lower = belief.text.toLowerCase();

    if (context.identityAttack) {
      if (/nie myl|nigdy|słabość|nie przyzn|obron/i.test(lower)) {
        confidence += 3;
      }
    }

    if (context.messageIntent === "fair_argument" || context.identityAffirmation) {
      if (/nie myl|nigdy|słabość|nie przyzn|obron|tajemn/i.test(lower)) {
        confidence -= context.identityAffirmation ? 4 : 2;
      }
      if (/prawda|ufaj|bezpiecz|zaufan/i.test(lower)) {
        confidence -= 2;
      }
    }

    if (context.messageIntent === "compliment" && !context.identityAffirmation) {
      if (/ufaj|mił|bezpiecz/i.test(lower)) {
        confidence += 1;
      }
      if (/nie myl|tajemn|obron/i.test(lower)) {
        confidence += 2;
      }
    }

    if (context.concessionLikely && (context.messageIntent === "fair_argument" || context.identityAffirmation)) {
      if (/słabość|nie przyzn/i.test(lower)) {
        confidence -= 3;
      }
    }

    return { ...belief, confidence: clamp(confidence) };
  });
}
