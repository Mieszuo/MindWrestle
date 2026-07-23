import { describe, expect, it } from "vitest";
import { declineCharacterNameWithZ, getConversationGreeting } from "@/lib/game/conversation-greetings";
import type { PlayerReputation } from "@/lib/game/reputation";

describe("Polish declension of character names", () => {
  it("declines core character names in instrumental case (Narzędnik) correctly", () => {
    expect(declineCharacterNameWithZ("Mila")).toBe("Milą");
    expect(declineCharacterNameWithZ("Dziecko Mila")).toBe("Dzieckiem Milą");
    expect(declineCharacterNameWithZ("Chytry Handlarz")).toBe("Chytrym Handlarzem");
    expect(declineCharacterNameWithZ("Dumny Rycerz")).toBe("Dumnym Rycerzem");
    expect(declineCharacterNameWithZ("Uparty Ork")).toBe("Upartym Orkiem");
    expect(declineCharacterNameWithZ("Jasny Mędrzec")).toBe("Jasnym Mędrcem");
    expect(declineCharacterNameWithZ("Wspaniały Król")).toBe("Wspaniałym Królem");
    expect(declineCharacterNameWithZ("Leśna dziewczynka")).toBe("Leśną dziewczynką");
  });

  it("applies general feminine ending decline as fallback", () => {
    expect(declineCharacterNameWithZ("Karczmarka")).toBe("Karczmarką");
  });

  it("leaves other names unchanged", () => {
    expect(declineCharacterNameWithZ("?")).toBe("?");
    expect(declineCharacterNameWithZ("Ork")).toBe("Ork");
  });
});

describe("getConversationGreeting with declined rumors", () => {
  it("includes properly declined rumor about meeting a previous character", () => {
    const reputation: PlayerReputation = {
      renown: 50,
      traits: { respect: 50, warmth: 50, pressure: 50, cunning: 50, arrogance: 50 },
      tags: [],
      lastIncident: {
        characterName: "Chytry Handlarz",
        tag: "forced_demand",
        at: new Date().toISOString(),
      },
    };

    const greeting = getConversationGreeting(3, reputation); // Level 3 (Dumny Rycerz)
    expect(greeting).toContain("Plotka o twoim spotkaniu z Chytrym Handlarzem dotarła tu wcześniej");
  });
});
