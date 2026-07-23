import { describe, expect, it } from "vitest";

import { deriveVoiceDelivery } from "@/lib/game/voice-delivery";

describe("deriveVoiceDelivery", () => {
  it("lowers stability when patience is critical on level 1", () => {
    const comfortable = deriveVoiceDelivery(
      1,
      { stability: 0.58, similarityBoost: 0.72, speed: 0.96, style: 0.35 },
      { trust: 52, suspicion: 25, patience: 80 },
    );
    const critical = deriveVoiceDelivery(
      1,
      { stability: 0.58, similarityBoost: 0.72, speed: 0.96, style: 0.35 },
      { trust: 30, suspicion: 70, patience: 12 },
    );

    expect(critical.stability).toBeLessThan(comfortable.stability);
    expect(critical.style).toBeGreaterThan(comfortable.style);
    expect(critical.moodDanger).toBe("critical");
  });

  it("applies responseMode offsets", () => {
    const resistance = deriveVoiceDelivery(
      3,
      { stability: 0.55, similarityBoost: 0.75, speed: 0.98, style: 0.38 },
      { respect: 45, pride: 70, patience: 65 },
      { responseMode: "full_resistance" },
    );
    const crack = deriveVoiceDelivery(
      3,
      { stability: 0.55, similarityBoost: 0.75, speed: 0.98, style: 0.38 },
      { respect: 45, pride: 70, patience: 65 },
      { responseMode: "crack_in_armor" },
    );

    expect(crack.stability).toBeLessThan(resistance.stability);
    expect(crack.style).toBeGreaterThan(resistance.style);
  });
});
