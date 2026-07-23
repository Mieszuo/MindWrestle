import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export const GAME_INTRO_VERSION = 1;

type Supabase = SupabaseClient<Database>;

export async function getOrCreateGameIntroState(supabase: Supabase, userId: string) {
  const select = "has_seen_game_intro, game_intro_seen_at, game_intro_version";
  const { data, error } = await supabase.from("profiles").select(select).eq("id", userId).maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data;

  const { data: profile, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select(select)
    .single();

  if (insertError) throw new Error(insertError.message);
  return profile;
}
