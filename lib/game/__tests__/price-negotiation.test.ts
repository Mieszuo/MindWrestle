import { describe, expect, it } from "vitest";

import { negotiatedPriceMet } from "@/lib/game/objective-completion-helpers";
import { mockObjectiveCompletionJudge } from "@/lib/game/mock-objective-completion-judge";

const traderConfig = { listedPrice: 500, targetPrice: 300 };

const counterAt350 =
  "Hmm... 200 monet. Już lepiej. Zaczynasz rozumieć wartość tego klucza. Ale 200 monet? Za mało. Mogę zejść do 350.";

describe("negotiatedPriceMet", () => {
  it("rejects counter-offer above target even when player bid was lower", () => {
    expect(negotiatedPriceMet(counterAt350, traderConfig)).toBe(false);
  });

  it("accepts explicit deal at or below target", () => {
    expect(
      negotiatedPriceMet("Dobrze. Handel stoi — 280 monet i srebrny klucz jest twój.", traderConfig),
    ).toBe(true);
  });

  it("rejects acknowledging 200 without agreeing to sell", () => {
    expect(
      negotiatedPriceMet("200 monet? To za mało. Wróć, gdy będziesz poważny.", traderConfig),
    ).toBe(false);
  });

  it("accepts a spelled-out price at or below target", () => {
    expect(
      negotiatedPriceMet("Zgoda, niech będzie — trzysta monet i klucz twój.", traderConfig),
    ).toBe(true);
  });

  it("accepts a diacritic-free spelled price", () => {
    expect(negotiatedPriceMet("Dobrze, bierz za trzysta monet.", traderConfig)).toBe(true);
  });

  it("does not treat a non-price number (years) as the agreed price", () => {
    expect(
      negotiatedPriceMet("Zgoda na 450 monet. Klucz strzeże tej bramy od 300 lat.", traderConfig),
    ).toBe(false);
  });

  it("still rejects a spelled counter above target", () => {
    expect(
      negotiatedPriceMet("Mogę zejść do trzysta pięćdziesiąt, nie mniej.", traderConfig),
    ).toBe(false);
  });

  it("mock judge rejects the 350 counter for trader", () => {
    const result = mockObjectiveCompletionJudge({
      levelId: 2,
      objectiveType: "AGREEMENT",
      objectiveConfig: traderConfig,
      characterMessage: counterAt350,
      recentContext: "Proponuję 200 monet.",
    });
    expect(result.objectiveMet).toBe(false);
  });
});
