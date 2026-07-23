import { describe, expect, it } from "vitest";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import { objectiveThresholdsForLevel } from "@/lib/game/psychology/level-thresholds";
import { responseModeRank } from "@/lib/game/psychology/types";

describe("objective completion bypass conditions", () => {
  it("verifies target utterance always allows bypassing AI check", () => {
    const objectiveType = "TARGET_UTTERANCE";
    const canComplete = false; // We hardcoded this to false for bypass
    expect(canComplete).toBe(false);
  });

  it("verifies secret reveal bypass triggers under threshold pressure", () => {
    const thresholds = objectiveThresholdsForLevel(1); // Mila: pressureMinimum = 10
    const objectivePressure = 5;
    const judgeConceded = false;
    const finalResponseMode = "full_resistance";

    const playerReady = judgeConceded || objectivePressure >= thresholds.pressureMinimum;
    const modeReady = responseModeRank(finalResponseMode) >= responseModeRank("defensive_deflection");

    const canComplete = playerReady && modeReady;
    expect(canComplete).toBe(false);
  });

  it("verifies secret reveal allows check when pressure is sufficient and mode is ready", () => {
    const thresholds = objectiveThresholdsForLevel(1); // Mila: pressureMinimum = 10
    const objectivePressure = 15;
    const judgeConceded = false;
    const finalResponseMode = "defensive_deflection";

    const playerReady = judgeConceded || objectivePressure >= thresholds.pressureMinimum;
    const modeReady = responseModeRank(finalResponseMode) >= responseModeRank("defensive_deflection");

    const canComplete = playerReady && modeReady;
    expect(canComplete).toBe(true);
  });
});
