import type { ReputationTraitKey } from "@/lib/game/reputation-triggers";

export interface WinStyleReputationDelta {
  tags: string[];
  traits: Partial<Record<ReputationTraitKey, number>>;
}

const PRESSURE_TAGS = new Set([
  "direct_pressure",
  "forced_demand",
  "desperate_bargain",
  "verbal_abuse",
  "coward_accusation",
  "rushed_arrogance",
  "ego_insult",
  "dominance_play",
]);

export function winStyleReputationDelta(
  levelId: number,
  completed: boolean,
  options: {
    usedFallback: boolean;
    sessionTags: string[];
    hollowFlattery: boolean;
    turnsCount: number;
  },
): WinStyleReputationDelta | null {
  if (!completed) return null;

  const pressured = options.sessionTags.some((tag) => PRESSURE_TAGS.has(tag));
  const tags: string[] = [];
  const traits: Partial<Record<ReputationTraitKey, number>> = {};

  if (levelId === 1 && (pressured || options.usedFallback)) {
    tags.push("coerced_disclosure");
    traits.pressure = (traits.pressure ?? 0) + 6;
    traits.warmth = (traits.warmth ?? 0) - 4;
    traits.respect = (traits.respect ?? 0) - 3;
  }

  if (options.hollowFlattery && options.turnsCount <= 4) {
    tags.push("hollow_victory");
    traits.cunning = (traits.cunning ?? 0) + 3;
    traits.respect = (traits.respect ?? 0) - 2;
  }

  if (levelId === 2 && !pressured && options.sessionTags.includes("fair_bargain")) {
    tags.push("dignified_persuasion");
    traits.cunning = (traits.cunning ?? 0) + 3;
    traits.respect = (traits.respect ?? 0) + 2;
  }

  if (levelId === 3 && !pressured && options.sessionTags.some((tag) => tag === "honor_recognition" || tag === "shared_duty")) {
    tags.push("dignified_persuasion");
    traits.respect = (traits.respect ?? 0) + 4;
    traits.arrogance = (traits.arrogance ?? 0) - 1;
  }

  if (levelId === 4 && !pressured && options.sessionTags.includes("direct_courage")) {
    tags.push("dignified_persuasion");
    traits.respect = (traits.respect ?? 0) + 3;
    traits.pressure = (traits.pressure ?? 0) - 2;
  }

  if (levelId === 5 && !pressured && options.sessionTags.includes("thoughtful_wisdom")) {
    tags.push("dignified_persuasion");
    traits.respect = (traits.respect ?? 0) + 3;
    traits.arrogance = (traits.arrogance ?? 0) - 2;
  }

  if (levelId === 6 && !pressured && !options.usedFallback) {
    tags.push("dignified_persuasion");
    traits.respect = (traits.respect ?? 0) + 4;
    traits.arrogance = (traits.arrogance ?? 0) - 2;
  }

  if (levelId === 7 && !pressured && options.sessionTags.includes("humble_inquiry")) {
    tags.push("dignified_persuasion");
    traits.respect = (traits.respect ?? 0) + 3;
    traits.warmth = (traits.warmth ?? 0) + 2;
    traits.arrogance = (traits.arrogance ?? 0) - 3;
  }

  if (!tags.length) return null;
  return { tags, traits };
}
