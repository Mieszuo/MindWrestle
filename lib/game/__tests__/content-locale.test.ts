import { describe, expect, it } from "vitest";

import { getDefeatCopy } from "@/lib/game/defeat-copy";
import type { DefeatReason } from "@/lib/game/defeat";
import { getCharacterCard, moodWhisper } from "@/lib/game/character-card";
import { getEmotionMoodDisplay } from "@/lib/game/emotion-display";
import type { Character, LevelObjective } from "@/lib/game/types";

const forcedDemandReason: DefeatReason = {
  emotion: "suspicion",
  op: "lte",
  threshold: 0,
  currentValue: 0,
  reactionTag: "forced_demand",
};

describe("defeat copy locale", () => {
  it("returns Polish for pl", () => {
    expect(getDefeatCopy(1, forcedDemandReason, "pl").title).toBe("Zamknęła się");
  });

  it("returns English for en", () => {
    expect(getDefeatCopy(1, forcedDemandReason, "en").title).toBe("She shut down");
  });
});

const milaCharacter: Character = {
  id: "mila",
  name: "Mila",
  title: "Guardian of Memory",
  personality: "Fallback personality",
  archetype: "Guardian",
  portraitAsset: "mila.png",
  layers: { backgroundGlow: "", platformGlow: "", particleColor: "", silhouetteGradient: "" },
  motion: { floatDuration: 1, tiltMaxDeg: 1, particleDrift: 1 },
};

const milaObjective: LevelObjective = {
  type: "reveal_secret",
  goal: "Learn about the orchard",
  hint: "fallback hint",
};

describe("character card locale", () => {
  it("returns Polish for pl", () => {
    expect(getCharacterCard(milaCharacter, milaObjective, 1, "pl").howToTalk).toBe(
      "Mów spokojnie, jak opowiadacz przy kominku — krótkie zdania, ciepły ton, pytania przez skojarzenia.",
    );
  });

  it("returns English for en", () => {
    expect(getCharacterCard(milaCharacter, milaObjective, 1, "en").howToTalk).toBe(
      "Speak calmly, like a storyteller by the fireside — short sentences, a warm tone, questions through association.",
    );
  });

  it("localizes moodWhisper", () => {
    expect(moodWhisper("trust", 80, "pl")).toBe("coraz bardziej otwarta");
    expect(moodWhisper("trust", 80, "en")).toBe("growing more open");
  });
});

describe("emotion mood display locale", () => {
  it("returns Polish critical whisper for pl", () => {
    const result = getEmotionMoodDisplay(1, "patience", "patience", 0, "pl");
    expect(result.danger).toBe("critical");
    expect(result.whisper).toBe("koniec cierpliwości — rozmowa się urwie");
  });

  it("returns English critical whisper for en", () => {
    const result = getEmotionMoodDisplay(1, "patience", "patience", 0, "en");
    expect(result.danger).toBe("critical");
    expect(result.whisper).toBe("patience gone — the conversation will break off");
  });
});
