import { describe, expect, it } from "vitest";

import { buildKnownLoreBullets, getAllLevelLore } from "@/lib/game/lore/chronicle-entries";
import { detectLoreUse } from "@/lib/game/lore/detect-lore-use";
import {
  defaultPlayerLoreState,
  markEndingSeen,
  parsePlayerLoreState,
  unlockLoreFragment,
} from "@/lib/game/lore/player-lore-state";

describe("player lore state", () => {
  it("unlocks one Chronicle entry for a completed level", () => {
    const result = unlockLoreFragment(defaultPlayerLoreState(), 1, "2026-06-21T12:00:00.000Z");

    expect(result.isFirstDiscovery).toBe(true);
    expect(result.entry?.levelId).toBe(1);
    expect(result.state.discoveredFragments).toEqual(["mila-orchard-memory"]);
    expect(result.state.finalTruthProgress).toBe(1);
  });

  it("does not duplicate a fragment after replaying a level", () => {
    const first = unlockLoreFragment(defaultPlayerLoreState(), 2);
    const replay = unlockLoreFragment(first.state, 2);

    expect(replay.isFirstDiscovery).toBe(false);
    expect(replay.state.chronicleEntries).toHaveLength(1);
    expect(replay.state.discoveredFragments).toHaveLength(1);
  });

  it("repairs derived progress while parsing stored data", () => {
    const parsed = parsePlayerLoreState({
      discoveredFragments: ["a", "a", "b"],
      chronicleEntries: [],
      finalTruthProgress: 99,
      endingSeen: true,
    });

    expect(parsed.discoveredFragments).toEqual(["a", "b"]);
    expect(parsed.finalTruthProgress).toBe(2);
    expect(parsed.endingSeen).toBe(true);
  });

  it("feeds only previously discovered truths into later conversations", () => {
    const entries = getAllLevelLore();
    const known = buildKnownLoreBullets(
      [entries[0].fragmentId, entries[1].fragmentId, entries[2].fragmentId],
      3,
    );

    expect(known).toEqual(entries[2].promptBullets);
  });

  it("detects candidates for lore use (deterministic pre-check)", () => {
    const entries = getAllLevelLore();
    const result = detectLoreUse(
      "Słyszałem o tym co stało się orkom. Niesłusznie zrzucili na nich winę przez kłamstwa i rozkaz Rycerza.",
      [entries[2].fragmentId, entries[3].fragmentId],
      6,
    );

    expect(result.quality).toBe("candidate");
    expect(result.candidateFragments).toContain(entries[2].fragmentId);
    expect(result.candidateFragments).toContain(entries[3].fragmentId);
  });

  it("detects keyword stuffing and blocks candidates", () => {
    const entries = getAllLevelLore();
    const result = detectLoreUse(
      "prawda, król, brama, rozkaz, ork, niesłusznie, strach, zamknął",
      [entries[3].fragmentId, entries[5].fragmentId],
      7,
    );

    expect(result.quality).toBe("keyword_stuffing");
    expect(result.candidateFragments.length).toBeGreaterThan(0);
  });

  it("ignores un-recovered lore entirely", () => {
    const entries = getAllLevelLore();
    const result = detectLoreUse(
      "Powiem Królowi, żeby otworzył bramę.",
      [entries[0].fragmentId], // Player only finished level 1
      3, // Current level is 3
    );

    expect(result.quality).toBe("none");
    expect(result.candidateFragments.length).toBe(0);
  });

  it("marks the epilogue as seen without losing Chronicle progress", () => {
    const unlocked = unlockLoreFragment(defaultPlayerLoreState(), 1).state;
    const finished = markEndingSeen(unlocked);

    expect(finished.endingSeen).toBe(true);
    expect(finished.discoveredFragments).toEqual(unlocked.discoveredFragments);
  });
});
