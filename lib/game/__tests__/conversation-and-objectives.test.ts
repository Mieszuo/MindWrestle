import { describe, expect, it } from "vitest";

import { sortConversationMessages } from "@/lib/game/conversation-message-order";
import { combineObjectiveMetJudges } from "@/lib/game/evaluate-objective-met";
import { milaConcessionMet } from "@/lib/game/mila-concession";
import { evaluatePsychObjectiveCompletion } from "@/lib/game/psychology/objective-pressure";

describe("conversation message order", () => {
  it("sorts user before character within the same turn", () => {
    const ordered = sortConversationMessages([
      {
        id: "b",
        turn_index: 2,
        role: "CHARACTER",
        created_at: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "a",
        turn_index: 2,
        role: "USER",
        created_at: "2026-01-01T12:00:00.000Z",
      },
    ]);

    expect(ordered.map((message) => message.role)).toEqual(["USER", "CHARACTER"]);
  });
});

describe("Mila concession loosening", () => {
  it("counts reluctant apple memory as concession", () => {
    const met = milaConcessionMet(
      "Nie... nie chcę o tym mówić. To było dawno, a teraz jabłka pachną inaczej.",
      "Czyli lubisz sady?",
    );
    expect(met).toBe(true);
  });

  it("allows psych win at defensive deflection when content already met", () => {
    const result = evaluatePsychObjectiveCompletion({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Nie... nie chcę o tym mówić. To było dawno, a teraz jabłka pachną inaczej.",
      objectivePressure: 14,
      responseMode: "defensive_deflection",
      judgeConceded: false,
      objectiveMetByJudge: true,
      completionRoll: 99,
      fallbackUsed: false,
    });

    expect(result.completed).toBe(true);
  });
});

describe("objective met combination", () => {
  it("requires both judges for AGREEMENT and SECRET_REVEAL", () => {
    expect(combineObjectiveMetJudges("AGREEMENT", true, false)).toBe(false);
    expect(combineObjectiveMetJudges("AGREEMENT", false, true)).toBe(false);
    expect(combineObjectiveMetJudges("AGREEMENT", true, true)).toBe(true);
    expect(combineObjectiveMetJudges("SECRET_REVEAL", true, false)).toBe(false);
  });

  it("allows either judge for CONCESSION", () => {
    expect(combineObjectiveMetJudges("CONCESSION", true, false)).toBe(true);
    expect(combineObjectiveMetJudges("CONCESSION", false, true)).toBe(true);
  });
});

describe("king and sage psych completion guards", () => {
  it("does not complete king agreement on judge flag alone without pressure", () => {
    const result = evaluatePsychObjectiveCompletion({
      levelId: 6,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Nie otworzę bramy.",
      objectivePressure: 8,
      responseMode: "defensive_deflection",
      judgeConceded: false,
      objectiveMetByJudge: true,
      completionRoll: 0,
      fallbackUsed: false,
    });
    expect(result.completed).toBe(false);
  });

  it("does not complete sage reveal on judge flag alone without mode readiness", () => {
    const result = evaluatePsychObjectiveCompletion({
      levelId: 5,
      objectiveType: "SECRET_REVEAL",
      objectiveConfig: {},
      characterMessage: "W bibliotece cienie są długie.",
      objectivePressure: 8,
      responseMode: "full_resistance",
      judgeConceded: false,
      objectiveMetByJudge: true,
      completionRoll: 0,
      fallbackUsed: false,
    });
    expect(result.completed).toBe(false);
  });
});
