import type { LoreUseResult } from "@/lib/game/lore/detect-lore-use";

/** Whether the player meaningfully used prior-level lore this turn.
 *  Deterministic: a "candidate" rating from detectLoreUse counts on its own,
 *  so the lore gate no longer depends on the AI-only `uses_previous_lore` tag. */
export function resolveUsesLore(loreUse: LoreUseResult, aiReactionTags: string[]): boolean {
  if (aiReactionTags.includes("uses_previous_lore")) return true;
  return loreUse.quality === "candidate";
}
