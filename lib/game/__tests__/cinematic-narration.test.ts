import { describe, expect, it } from "vitest";

import { getEndingNarration, getIntroNarration } from "@/lib/game/cinematic-narration";

describe("cinematic narrator direction", () => {
  it.each(["pl", "en"] as const)("uses only restrained chronicler directions and at most one pause per slide (%s)", (locale) => {
    const allowed = new Set(["slowly", "quietly", "softly", "solemnly"]);

    for (const entry of [...getIntroNarration(locale), ...getEndingNarration(locale)]) {
      expect(allowed.has(entry.voicePerformance.direction)).toBe(true);
      expect(entry.voicePerformance.pauseAfterSentence.length).toBeLessThanOrEqual(1);
    }
  });
});

