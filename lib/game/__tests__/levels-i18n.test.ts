import { describe, expect, it } from "vitest";
import { levelsFromApiRows } from "@/lib/game/levels-client";
import { emptyPlayerProgress } from "@/lib/game/progress";

const baseRow = {
  id: 1, slug: "mila", is_active: true, order_index: 0,
  title: "Milczenie Mili", character_name: "Dziecko Mila",
  archetype: "Ciekawska i wrażliwa", short_description: "…",
  difficulty_label: "łatwa", objective_type: "TARGET_UTTERANCE",
  objective_config: {},
  i18n: {
    en: {
      character_name: "Child Mila",
      archetype: "Curious and sensitive",
      publicDescription: "A curious and sensitive child.",
    },
  },
} as any;

const progress = emptyPlayerProgress();

describe("levelsFromApiRows i18n", () => {
  it("uses English fields when locale=en", () => {
    const [lvl] = levelsFromApiRows([baseRow], progress, "en");
    expect(lvl.character.name).toBe("Child Mila");
    expect(lvl.character.archetype).toBe("Curious and sensitive");
  });
  it("falls back to base Polish columns when locale field missing", () => {
    const [lvl] = levelsFromApiRows([baseRow], progress, "pl");
    expect(lvl.character.name).toBe("Dziecko Mila");
  });
  it("resolves character.personality from i18n publicDescription when locale=en, falling back to short_description for pl", () => {
    const [lvlEn] = levelsFromApiRows([baseRow], progress, "en");
    expect(lvlEn.character.personality).toBe("A curious and sensitive child.");

    const [lvlPl] = levelsFromApiRows([baseRow], progress, "pl");
    expect(lvlPl.character.personality).toBe(baseRow.short_description);
  });
});
