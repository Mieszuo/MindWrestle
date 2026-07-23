import { describe, expect, it } from "vitest";

import { foldPolish } from "@/lib/game/text/fold-polish";

describe("foldPolish", () => {
  it("strips Polish diacritics and lowercases", () => {
    expect(foldPolish("Kamień")).toBe("kamien");
    expect(foldPolish("CIEŃ")).toBe("cien");
    expect(foldPolish("źdźbło")).toBe("zdzblo");
  });

  it("folds ł and Ł to l (no NFD decomposition exists)", () => {
    expect(foldPolish("Łódź")).toBe("lodz");
    expect(foldPolish("jabłko")).toBe("jablko");
  });

  it("is idempotent and leaves plain ascii unchanged", () => {
    expect(foldPolish("trzysta monet")).toBe("trzysta monet");
    expect(foldPolish(foldPolish("Pięćset"))).toBe("piecset");
  });
});
