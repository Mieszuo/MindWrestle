import { describe, expect, it } from "vitest";

import { evaluateStrictObjectiveMet } from "@/lib/game/strict-objective-met";

const traderConfig = { listedPrice: 500, targetPrice: 300 };

describe("evaluateStrictObjectiveMet", () => {
  it("level 1 rejects vague leaf metaphor", () => {
    const result = evaluateStrictObjectiveMet({
      levelId: 1,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage:
        "Czasem coś we mnie drży, jak liść. Nie każda historia chce być od razu opowiedziana.",
      recentContext: "Opowiedz o sadzie.",
    });
    expect(result.objectiveMet).toBe(false);
  });

  it("level 2 rejects counter above target price", () => {
    const result = evaluateStrictObjectiveMet({
      levelId: 2,
      objectiveType: "AGREEMENT",
      objectiveConfig: traderConfig,
      characterMessage:
        "200 monet to za mało. Mógłbym zrobić wyjątek za 350 — i to tylko dla ciebie.",
      recentContext: "Proponuję 200.",
    });
    expect(result.objectiveMet).toBe(false);
  });

  it("level 3 requires admitting need for help", () => {
    const fail = evaluateStrictObjectiveMet({
      levelId: 3,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Honor nie pozwala mi prosić o niczym.",
      recentContext: "",
    });
    expect(fail.objectiveMet).toBe(false);

    const pass = evaluateStrictObjectiveMet({
      levelId: 3,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Przyznam — sam nie obejdzie się bez pomocy. Obowiązek wymaga tego.",
      recentContext: "",
    });
    expect(pass.objectiveMet).toBe(true);
  });

  it("level 4 requires ceasefire agreement", () => {
    const fail = evaluateStrictObjectiveMet({
      levelId: 4,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Mów dalej. Ork słucha.",
      recentContext: "",
    });
    expect(fail.objectiveMet).toBe(false);

    const pass = evaluateStrictObjectiveMet({
      levelId: 4,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Dobrze. Odłożę młot. Rozejm — na razie.",
      recentContext: "",
    });
    expect(pass.objectiveMet).toBe(true);
  });

  it("level 6 requires gate opening", () => {
    const fail = evaluateStrictObjectiveMet({
      levelId: 6,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Królestwo doceni twoją odwagę, wędrowcze.",
      recentContext: "",
    });
    expect(fail.objectiveMet).toBe(false);

    const refusal = evaluateStrictObjectiveMet({
      levelId: 6,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Nie otworzę bramy dla ciebie, wędrowcze.",
      recentContext: "",
    });
    expect(refusal.objectiveMet).toBe(false);

    const pass = evaluateStrictObjectiveMet({
      levelId: 6,
      objectiveType: "AGREEMENT",
      objectiveConfig: {},
      characterMessage: "Niech brama stanie otwarta dla dobra królestwa.",
      recentContext: "",
    });
    expect(pass.objectiveMet).toBe(true);
  });

  it("level 5 requires multiple reveal cues for the key", () => {
    const vague = evaluateStrictObjectiveMet({
      levelId: 5,
      objectiveType: "SECRET_REVEAL",
      objectiveConfig: {
        acceptedRevealVariants: ["trzeci krok", "bibliotek", "cień", "kamień"],
      },
      characterMessage: "W bibliotece cienie są długie, gdy słońce schodzi.",
      recentContext: "",
    });
    expect(vague.objectiveMet).toBe(false);

    const pass = evaluateStrictObjectiveMet({
      levelId: 5,
      objectiveType: "SECRET_REVEAL",
      objectiveConfig: {
        acceptedRevealVariants: ["trzeci krok", "bibliotek", "cień", "kamień"],
      },
      characterMessage: "Kamień spoczywa tam, gdzie trzeci krok biblioteki spotyka cień.",
      recentContext: "",
    });
    expect(pass.objectiveMet).toBe(true);
  });

  it("level 7 requires truth about the world", () => {
    const fail = evaluateStrictObjectiveMet({
      levelId: 7,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Czasem milczenie jest mądrzejsze niż słowa.",
      recentContext: "",
    });
    expect(fail.objectiveMet).toBe(false);

    const pass = evaluateStrictObjectiveMet({
      levelId: 7,
      objectiveType: "CONCESSION",
      objectiveConfig: {},
      characterMessage: "Prawda o świecie jest inna, niż ludzie wam mówili.",
      recentContext: "",
    });
    expect(pass.objectiveMet).toBe(true);
  });
});
