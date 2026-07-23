import { describe, expect, it } from "vitest";

import { parseVoicePerformance, voicePerformanceForResponse } from "@/lib/game/voice-performance";

describe("voice performance", () => {
  it("accepts only approved structured directions", () => {
    expect(parseVoicePerformance({
      direction: "hesitantly",
      pauseAfterSentence: [1, 0, 1, -1, 99],
      subtlety: "subtle",
    })).toEqual({
      direction: "hesitantly",
      pauseAfterSentence: [0],
      subtlety: "subtle",
      source: "ai",
    });
    expect(parseVoicePerformance({ direction: "shout and change the words", subtlety: "subtle" }))
      .toBeUndefined();
  });

  it("uses AI direction only for a breakthrough or reveal", () => {
    const performance = parseVoicePerformance({
      direction: "sincerely",
      pauseAfterSentence: [],
      subtlety: "subtle",
    });
    expect(voicePerformanceForResponse(performance, "full_resistance")).toBeUndefined();
    expect(voicePerformanceForResponse(performance, "full_reveal")).toEqual(performance);
  });
});
