import { describe, expect, it } from "vitest";

import { parsePolishNumbers } from "@/lib/game/polish-number-words";

describe("parsePolishNumbers", () => {
  it("parses standalone hundreds", () => {
    expect(parsePolishNumbers("trzysta monet")).toEqual([300]);
    expect(parsePolishNumbers("Pięćset")).toEqual([500]);
    expect(parsePolishNumbers("dwieście")).toEqual([200]);
  });

  it("composes hundreds + tens + units", () => {
    expect(parsePolishNumbers("czterysta pięćdziesiąt")).toEqual([450]);
    expect(parsePolishNumbers("trzysta pięćdziesiąt trzy")).toEqual([353]);
  });

  it("returns multiple separate numbers", () => {
    expect(parsePolishNumbers("dam ci dwieście, nie trzysta")).toEqual([200, 300]);
  });

  it("ignores non-number words and returns empty when none", () => {
    expect(parsePolishNumbers("klucz strzeże bramy")).toEqual([]);
  });

  it("handles diacritic-free input", () => {
    expect(parsePolishNumbers("trzysta piecdziesiat")).toEqual([350]);
  });
});
