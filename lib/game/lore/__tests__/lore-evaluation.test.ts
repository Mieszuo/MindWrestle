import { describe, expect, it } from "vitest";

import { resolveUsesLore } from "@/lib/game/lore/lore-evaluation";

describe("resolveUsesLore", () => {
  it("is true when the detector rates the use as candidate (no AI tag needed)", () => {
    expect(resolveUsesLore({ candidateFragments: ["f2"], quality: "candidate" }, [])).toBe(true);
  });

  it("is true when the AI already tagged it, regardless of detector", () => {
    expect(resolveUsesLore({ candidateFragments: [], quality: "none" }, ["uses_previous_lore"])).toBe(true);
  });

  it("is false for keyword stuffing", () => {
    expect(resolveUsesLore({ candidateFragments: ["f2"], quality: "keyword_stuffing" }, [])).toBe(false);
  });

  it("is false when there is no lore use and no AI tag", () => {
    expect(resolveUsesLore({ candidateFragments: [], quality: "none" }, ["direct_pressure"])).toBe(false);
  });
});
