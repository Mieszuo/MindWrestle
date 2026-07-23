import { describe, expect, it } from "vitest";

import { combineObjectiveMetJudges } from "@/lib/game/evaluate-objective-met";

describe("combineObjectiveMetJudges", () => {
  it("L7 requires BOTH strict and AI to agree (empty-metaphor AI win is vetoed)", () => {
    expect(combineObjectiveMetJudges("CONCESSION", false, true, 7)).toBe(false);
    expect(combineObjectiveMetJudges("CONCESSION", true, true, 7)).toBe(true);
  });

  it("L5 still requires both (unchanged)", () => {
    expect(combineObjectiveMetJudges("SECRET_REVEAL", false, true, 5)).toBe(false);
    expect(combineObjectiveMetJudges("SECRET_REVEAL", true, true, 5)).toBe(true);
  });

  it("other real levels stay AI-only", () => {
    expect(combineObjectiveMetJudges("AGREEMENT", false, true, 6)).toBe(true);
    expect(combineObjectiveMetJudges("CONCESSION", false, true, 1)).toBe(true);
  });

  it("no-levelId path keeps AND for AGREEMENT/SECRET_REVEAL (sage guess call site)", () => {
    expect(combineObjectiveMetJudges("SECRET_REVEAL", true, false)).toBe(false);
    expect(combineObjectiveMetJudges("SECRET_REVEAL", true, true)).toBe(true);
  });
});

describe("combineObjectiveMetJudges locale gating for level 7", () => {
  it("en: aiMet alone decides (strict Polish regex ignored)", () => {
    expect(combineObjectiveMetJudges("CONCESSION", /* strictMet */ false, /* aiMet */ true, 7, "en")).toBe(true);
  });

  it("pl: still requires strict && ai (unchanged Polish behavior)", () => {
    expect(combineObjectiveMetJudges("CONCESSION", false, true, 7, "pl")).toBe(false);
    expect(combineObjectiveMetJudges("CONCESSION", true, true, 7, "pl")).toBe(true);
  });

  it("no explicit locale defaults to pl (preserves existing callers' behavior)", () => {
    expect(combineObjectiveMetJudges("CONCESSION", false, true, 7)).toBe(false);
    expect(combineObjectiveMetJudges("CONCESSION", true, true, 7)).toBe(true);
  });
});
