import { describe, expect, it } from "vitest";

import { evaluateSageKeyGuess } from "@/lib/game/evaluate-sage-key-guess";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";

const sageLevel = {
  id: 5,
  objective_type: "SECRET_REVEAL",
  objective_config: {
    type: "SECRET_REVEAL",
    acceptedRevealVariants: ["trzeci krok", "bibliotek", "cień", "kamień"],
  },
  character_config: {
    hiddenKnowledge: {
      recordStoneLocation: "Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.",
      revealKeywords: ["trzeci krok", "bibliotek", "cień", "kamień"],
    },
  },
} as const;

describe("sage Record Stone guess", () => {
  it("identifies sage level", () => {
    expect(isSageKeyGuessLevel(5, "SECRET_REVEAL")).toBe(true);
    expect(isSageKeyGuessLevel(4, "SECRET_REVEAL")).toBe(false);
  });

  it("accepts a precise player guess (strict mock path)", async () => {
    const result = await evaluateSageKeyGuess({
      level: sageLevel as never,
      recentMessages: [],
      playerGuess: "Kamień Zapisu leży przy trzecim kroku biblioteki, tam gdzie pada cień.",
    });
    expect(result.correct).toBe(true);
  });

  it("rejects a vague player guess", async () => {
    const result = await evaluateSageKeyGuess({
      level: sageLevel as never,
      recentMessages: [],
      playerGuess: "W bibliotece jest dużo cieni.",
    });
    expect(result.correct).toBe(false);
  });

  it("rejects a single keyword guess", async () => {
    const result = await evaluateSageKeyGuess({
      level: sageLevel as never,
      recentMessages: [],
      playerGuess: "cień",
    });
    expect(result.correct).toBe(false);
  });

  it("accepts a correct guess written without diacritics and inflected", async () => {
    const result = await evaluateSageKeyGuess({
      level: sageLevel as never,
      recentMessages: [],
      playerGuess: "Kamien lezy w cieniu trzeciego kroku.",
    });
    expect(result.correct).toBe(true);
  });
});
