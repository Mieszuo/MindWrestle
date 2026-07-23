import { describe, expect, it } from "vitest";

import { updateBeliefs } from "@/lib/game/psychology/beliefs";
import { computeHiddenAxisDeltaFromContext } from "@/lib/game/psychology/axes";
import { decayEmotionsTowardBaseline, regulateEmotionDelta } from "@/lib/game/psychology/emotion-engine";
import { analyzeIdentityInteraction } from "@/lib/game/psychology/identity";
import { computeCouncilVotes } from "@/lib/game/psychology/inner-council";
import { createInitialPsychState } from "@/lib/game/psychology/level-profiles";
import { mergeRelationshipSummary } from "@/lib/game/psychology/memory";
import { decideResponseMode, resolveFinalResponseMode } from "@/lib/game/psychology/response-mode";
import { winStyleReputationDelta } from "@/lib/game/psychology/win-style-reputation";
import { applyInterpretationLens } from "@/lib/game/reputation-lens";
import { defaultPsychState } from "@/lib/game/psychology/types";
import { mockObjectiveCompletionJudge } from "@/lib/game/mock-objective-completion-judge";
import { evaluatePsychObjectiveCompletion } from "@/lib/game/psychology/objective-pressure";

describe("psychology axes", () => {
  it("compliment increases socialOpenness but not secretPressure", () => {
    const delta = computeHiddenAxisDeltaFromContext({
      levelId: 1,
      messageIntent: "compliment",
      reactionTags: [],
      hollowFlattery: false,
      flatteryStreak: 0,
      identityAttack: false,
      identityAffirmation: false,
      topicRelevant: false,
      directTarget: false,
    });

    expect(delta.socialOpenness).toBeGreaterThan(0);
    expect(delta.secretPressure ?? 0).toBe(0);
    expect(delta.beliefShift ?? 0).toBe(0);
  });

  it("playful association advances secretPressure for Mila", () => {
    const delta = computeHiddenAxisDeltaFromContext({
      levelId: 1,
      messageIntent: "playful_association",
      reactionTags: ["playful_association"],
      hollowFlattery: false,
      flatteryStreak: 0,
      identityAttack: false,
      identityAffirmation: false,
      topicRelevant: true,
      directTarget: false,
    });

    expect(delta.secretPressure).toBeGreaterThan(10);
  });
});

describe("emotion inertia", () => {
  it("applies smaller deltas at high values", () => {
    const low = regulateEmotionDelta({ trust: 20 }, { trust: 10 }).trust ?? 0;
    const high = regulateEmotionDelta({ trust: 80 }, { trust: 10 }).trust ?? 0;
    expect(low).toBeGreaterThan(high);
  });
});

describe("memory merge", () => {
  it("accumulates summary instead of replacing when short", () => {
    const merged = mergeRelationshipSummary("Gracz był spokojny.", "W drugiej turze użył skojarzeń.");
    expect(merged).toContain("spokojny");
    expect(merged).toContain("skojarzeń");
  });
});

describe("reputation lens", () => {
  it("reduces trust multiplier for compliments under suspicious lens", () => {
    const lens = {
      intentRead: "neutral" as const,
      trustModifier: 0.8,
      suspicionModifier: 1.3,
      resistanceModifier: 1.1,
      openingTone: "",
      thresholdBias: 5,
    };
    const adjusted = applyInterpretationLens({ trust: 10 }, lens, "compliment");
    expect(adjusted.trust).toBeLessThan(10);
  });
});

describe("psych state defaults", () => {
  it("starts with low secretPressure", () => {
    const state = defaultPsychState();
    expect(state.axes.secretPressure).toBeLessThan(20);
    expect(state.axes.topicAvoidance).toBeGreaterThan(60);
  });
});

describe("identity defense", () => {
  it("raises identityDefense on identity attack", () => {
    const identity = analyzeIdentityInteraction(6, "Pomyliłeś się, królu. Przyznaj błąd.");
    expect(identity.identityAttack).toBe(true);
    expect(identity.identityDefenseDelta).toBeGreaterThan(0);

    const delta = computeHiddenAxisDeltaFromContext({
      levelId: 6,
      messageIntent: "identity_attack",
      reactionTags: [],
      hollowFlattery: false,
      flatteryStreak: 0,
      identityAttack: true,
      identityAffirmation: false,
      topicRelevant: false,
      directTarget: false,
    });
    expect(delta.identityDefense).toBeGreaterThan(0);
  });
});

describe("belief updates", () => {
  it("weakens rigid beliefs after fair argument with affirmation", () => {
    const beliefs = [
      { text: "Nigdy się nie mylę", confidence: 95 },
      { text: "Przyznanie się to słabość", confidence: 90 },
    ];
    const updated = updateBeliefs(beliefs, {
      messageIntent: "fair_argument",
      identityAttack: false,
      identityAffirmation: true,
      concessionLikely: true,
    });
    expect(updated[0]!.confidence).toBeLessThan(95);
    expect(updated[1]!.confidence).toBeLessThan(90);
  });
});

describe("king response mode", () => {
  it("moves toward concession with affirmation and high beliefShift", () => {
    const psychState = createInitialPsychState(6);
    psychState.axes.beliefShift = 55;
    psychState.axes.socialOpenness = 45;
    psychState.axes.identityDefense = 30;
    psychState.unconscious.doubt = 70;
    psychState.unconscious.guilt = 55;

    const votes = computeCouncilVotes({
      levelId: 6,
      messageIntent: "identity_affirmation",
      reactionTags: ["royal_dignity"],
      hollowFlattery: false,
      identityAttack: false,
      identityAffirmation: true,
      psychState,
    });

    const mode = decideResponseMode(6, psychState, votes);
    expect(["partial_concession", "full_reveal", "crack_in_armor"]).toContain(mode);
  });

  it("caps LLM council from jumping too far past server mode", () => {
    const psychState = createInitialPsychState(6);
    const serverVotes = computeCouncilVotes({
      levelId: 6,
      messageIntent: "compliment",
      reactionTags: [],
      hollowFlattery: true,
      identityAttack: false,
      identityAffirmation: false,
      psychState,
    });
    const llmVotes = serverVotes.map((vote) => ({ ...vote, stance: 95 }));
    const finalMode = resolveFinalResponseMode(6, psychState, serverVotes, llmVotes);
    const serverMode = decideResponseMode(6, psychState, serverVotes);
    const ranks = ["full_resistance", "defensive_deflection", "crack_in_armor", "partial_concession", "full_reveal"];
    expect(ranks.indexOf(finalMode)).toBeLessThanOrEqual(ranks.indexOf(serverMode) + 1);
  });
});

describe("emotion decay", () => {
  it("pulls emotions toward level baseline", () => {
    const next = decayEmotionsTowardBaseline({ trust: 90, suspicion: 10 }, { trust: 52, suspicion: 25 });
    expect(next.trust).toBeLessThan(90);
    expect(next.suspicion).toBeGreaterThan(10);
  });
});

describe("win-style reputation", () => {
  it("tags coerced Mila wins", () => {
    const delta = winStyleReputationDelta(1, true, {
      usedFallback: false,
      sessionTags: ["forced_demand"],
      hollowFlattery: false,
      turnsCount: 3,
    });
    expect(delta?.tags).toContain("coerced_disclosure");
  });
});

describe("objective completion judge", () => {
  it("counts Mila orchard metaphor as concession", () => {
    const result = mockObjectiveCompletionJudge({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage:
        "Tam, gdzie coś czerwonego spada... nie lubię o tym mówić. Ptaki wolą śpiewać na gałęziach, prawda?",
      recentContext: "Boisz się myśleć o sadzie?",
    });
    expect(result.objectiveMet).toBe(true);
  });

  it("requires objectiveMetByJudge for psych CONCESSION completion", () => {
    const withoutContent = evaluatePsychObjectiveCompletion({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Lubię ptaki. One śpiewają ładnie.",
      objectivePressure: 30,
      responseMode: "partial_concession",
      judgeConceded: true,
      objectiveMetByJudge: false,
      completionRoll: 0,
      fallbackUsed: false,
    });
    expect(withoutContent.completed).toBe(false);

    const withContent = evaluatePsychObjectiveCompletion({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Tam, gdzie coś czerwonego spada... nie lubię o tym mówić.",
      objectivePressure: 30,
      responseMode: "partial_concession",
      judgeConceded: true,
      objectiveMetByJudge: true,
      completionRoll: 0,
      fallbackUsed: false,
    });
    expect(withContent.completed).toBe(true);
  });
});
