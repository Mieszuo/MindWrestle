import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Db = SupabaseClient<Database>;
export type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];
export type AttemptRow = Database["public"]["Tables"]["conversation_attempts"]["Row"];
export type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];
