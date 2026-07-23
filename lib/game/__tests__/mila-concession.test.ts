import { describe, expect, it } from "vitest";

import { milaConcessionMet } from "@/lib/game/mila-concession";
import { mockObjectiveCompletionJudge } from "@/lib/game/mock-objective-completion-judge";

const leafQuote =
  "Czasem... coś we mnie drży, jak liść, który wie, że zaraz może spaść. Nie każda historia chce być od razu opowiedziana.";

describe("milaConcessionMet", () => {
  it("rejects vague leaf metaphor even when player mentioned the orchard", () => {
    expect(milaConcessionMet(leafQuote, "Opowiedz mi o sadzie za domem. Boję się, że tam coś się stało.")).toBe(
      false,
    );
  });

  it("accepts orchard metaphor with emotional refusal", () => {
    expect(
      milaConcessionMet(
        "Tam, gdzie coś czerwonego spada... nie lubię o tym mówić. Ptaki wolą śpiewać na gałęziach, prawda?",
        "Boisz się myśleć o sadzie?",
      ),
    ).toBe(true);
  });

  it("accepts direct fear about the orchard", () => {
    expect(milaConcessionMet("Boję się myśleć o tamtym sadzie. Tam coś złego się stało.", "")).toBe(true);
  });

  it("mock judge rejects the leaf quote for CONCESSION", () => {
    const result = mockObjectiveCompletionJudge({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: leafQuote,
      recentContext: "Opowiedz spokojnie o sadzie i czerwonym owocu.",
    });
    expect(result.objectiveMet).toBe(false);
  });
});
