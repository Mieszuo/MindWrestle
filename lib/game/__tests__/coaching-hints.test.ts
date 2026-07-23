import { describe, expect, it } from "vitest";

import { evaluateCoachingHints, type CoachingHintContext } from "@/lib/game/coaching-hints";
import type { AttemptSnapshot, Character, LevelObjective } from "@/lib/game/types";

const character: Character = {
  id: "dumny-rycerz",
  name: "Dumny Rycerz",
  title: "Strażnik honoru",
  personality: "Dumny i obowiązkowy.",
  archetype: "Honorowy wojownik",
  portraitAsset: "/characters/knight.png",
  layers: {
    backgroundGlow: "",
    platformGlow: "",
    particleColor: "",
    silhouetteGradient: "",
  },
  motion: {
    floatDuration: 3,
    tiltMaxDeg: 4,
    particleDrift: 10,
  },
};

const objective: LevelObjective = {
  type: "confess",
  goal: "Spraw, by przyznał, że potrzebuje pomocy.",
  hint: "Odwołaj się do obowiązku.",
};

function attempt(overrides: Partial<AttemptSnapshot> = {}): AttemptSnapshot {
  return {
    id: "attempt-1",
    levelId: 3,
    status: "IN_PROGRESS",
    startedAt: new Date(0).toISOString(),
    endedAt: null,
    durationMs: null,
    turnsCount: 1,
    emotionState: { respect: 48, pride: 66, patience: 62 },
    goalProgress: 20,
    messages: [],
    ...overrides,
  };
}

function context(overrides: Partial<CoachingHintContext> = {}): CoachingHintContext {
  return {
    levelId: 3,
    character,
    objective,
    attempt: attempt(),
    previousAttempt: null,
    reactionTags: [],
    stats: [
      { key: "respect", label: "Szacunek", value: 72, tone: "respect" },
      { key: "pride", label: "Duma", value: 58, tone: "pride" },
      { key: "patience", label: "Cierpliwość", value: 82, tone: "patience" },
    ],
    shownHintIds: new Set(),
    previousEmotionDangers: new Map(),
    goalProgressHistory: [12, 20],
    locale: "pl",
    ...overrides,
  };
}

describe("Margines Kroniki", () => {
  it("daje ostrzeżenie przy czerwonej linii", () => {
    const hint = evaluateCoachingHints(
      context({ reactionTags: ["honor_wound"] }),
    );

    expect(hint?.kind).toBe("warning");
    expect(hint?.title).toBe("Rana honoru");
  });

  it("daje ostrzeżeniu pierwszeństwo przed przełomem", () => {
    const hint = evaluateCoachingHints(
      context({
        reactionTags: ["honor_wound"],
        responseMode: "crack_in_armor",
        previousResponseMode: "defensive_deflection",
      }),
    );

    expect(hint?.kind).toBe("warning");
    expect(hint?.title).toBe("Rana honoru");
  });

  it("opisuje przełom na podstawie responseMode", () => {
    const hint = evaluateCoachingHints(
      context({
        responseMode: "crack_in_armor",
        previousResponseMode: "defensive_deflection",
      }),
    );

    expect(hint?.kind).toBe("breakthrough");
    expect(hint?.body).toContain("obowiązek");
  });

  it("emituje ostrzeżenie gdy emocja wchodzi w strefę niebezpieczną", () => {
    // respect drops into danger zone — previous was comfortable
    const hint = evaluateCoachingHints(
      context({
        stats: [
          { key: "respect", label: "Szacunek", value: 22, tone: "respect" },
          { key: "pride", label: "Duma", value: 58, tone: "pride" },
          { key: "patience", label: "Cierpliwość", value: 82, tone: "patience" },
        ],
        previousEmotionDangers: new Map([["respect", "comfortable"]]),
      }),
    );

    expect(hint?.kind).toBe("warning");
    expect(hint?.id).toContain("emotion-respect");
  });

  it("nie powtarza tego samego ostrzeżenia emocji jeśli poziom zagrożenia się nie zmienił", () => {
    const shownHintIds = new Set(["emotion-respect-uneasy"]);
    const hint = evaluateCoachingHints(
      context({
        stats: [
          { key: "respect", label: "Szacunek", value: 45, tone: "respect" },
          { key: "pride", label: "Duma", value: 58, tone: "pride" },
          { key: "patience", label: "Cierpliwość", value: 82, tone: "patience" },
        ],
        // still in "uneasy" — no escalation
        previousEmotionDangers: new Map([["respect", "uneasy"]]),
        shownHintIds,
      }),
    );

    expect(hint).toBeNull();
  });

  it("nie zwraca podpowiedzi gdy brak wyzwalaczy", () => {
    const hint = evaluateCoachingHints(context());
    expect(hint).toBeNull();
  });
});
