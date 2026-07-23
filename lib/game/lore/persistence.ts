import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLoreBeatPayload, type LoreBeatPayload } from "@/lib/game/lore/lore-beat-payload";
import type { Locale } from "@/lib/i18n/locale";
import {
  defaultPlayerLoreState,
  parsePlayerLoreState,
  playerLoreStateToJson,
  markEndingSeen,
  unlockLoreFragment,
  type PlayerLoreState,
} from "@/lib/game/lore/player-lore-state";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export async function fetchPlayerLoreState(supabase: Db, userId: string): Promise<PlayerLoreState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("lore_state")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parsePlayerLoreState(data?.lore_state);
}

export async function unlockPlayerLoreBeat(
  supabase: Db,
  userId: string,
  levelId: number,
  firstCompletion: boolean,
  unlockedAt = new Date().toISOString(),
  locale?: Locale,
): Promise<LoreBeatPayload | null> {
  if (!firstCompletion) return null;

  const current = await fetchPlayerLoreState(supabase, userId);
  const result = unlockLoreFragment(current, levelId, unlockedAt, locale);
  if (!result.entry) return null;

  if (result.isFirstDiscovery) {
    const { error } = await supabase
      .from("profiles")
      .update({
        lore_state: playerLoreStateToJson(result.state),
        updated_at: unlockedAt,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  }

  return buildLoreBeatPayload(levelId, result.entry, result.isFirstDiscovery, locale);
}

export async function markLoreBeatSeen(
  supabase: Db,
  userId: string,
  fragmentId: string,
): Promise<PlayerLoreState> {
  const current = await fetchPlayerLoreState(supabase, userId);
  const next = {
    ...current,
    completedLoreBeats: { ...current.completedLoreBeats, [fragmentId]: true },
  };
  const { error } = await supabase
    .from("profiles")
    .update({ lore_state: playerLoreStateToJson(next), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return next;
}

export async function markPlayerEndingSeen(
  supabase: Db,
  userId: string,
): Promise<PlayerLoreState> {
  const current = await fetchPlayerLoreState(supabase, userId);
  const next = markEndingSeen(current);
  const { error } = await supabase
    .from("profiles")
    .update({ lore_state: playerLoreStateToJson(next), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return next;
}

export { defaultPlayerLoreState };
