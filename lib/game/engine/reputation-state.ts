import {
  npcRelationsToJson,
  parseNpcRelations,
} from "@/lib/game/npc-relations";
import {
  mergeSessionIntoReputation,
  parseReputation,
  parseReputationContext,
  parseReputationSession,
  reputationToJson,
  type AttemptOutcome,
  type PlayerReputation,
} from "@/lib/game/reputation";

import type { AttemptRow, Db, GameLevelRow } from "./db-types";

export async function fetchUserNpcRelations(supabase: Db, userId: string) {
  const { data, error } = await supabase.from("profiles").select("npc_relations").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return parseNpcRelations(data?.npc_relations);
}

export async function persistUserNpcRelations(
  supabase: Db,
  userId: string,
  relations: ReturnType<typeof parseNpcRelations>,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ npc_relations: npcRelationsToJson(relations), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchUserReputation(supabase: Db, userId: string): Promise<PlayerReputation> {
  const { data, error } = await supabase.from("profiles").select("reputation").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return parseReputation(data?.reputation);
}

export async function persistUserReputation(supabase: Db, userId: string, reputation: PlayerReputation) {
  const { error } = await supabase
    .from("profiles")
    .update({ reputation: reputationToJson(reputation), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function flushAttemptReputation(
  supabase: Db,
  userId: string,
  attempt: AttemptRow,
  level: GameLevelRow,
  outcome: AttemptOutcome,
  options?: { firstCompletion?: boolean },
): Promise<{ reputation: PlayerReputation; renownDelta: number }> {
  const current = await fetchUserReputation(supabase, userId);
  const session = parseReputationSession(attempt.reputation_session);
  const repContext = parseReputationContext(attempt.reputation_context);
  const renownEligible = repContext?.renownEligible ?? true;
  const firstCompletion = options?.firstCompletion ?? renownEligible;
  const merged = mergeSessionIntoReputation(current, session, outcome, {
    levelId: level.id,
    characterName: level.character_name,
    at: new Date().toISOString(),
    firstCompletion,
  });
  await persistUserReputation(supabase, userId, merged);
  return { reputation: merged, renownDelta: merged.renown - current.renown };
}
