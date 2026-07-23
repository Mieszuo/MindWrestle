import type { Database } from "@/lib/supabase/database.types";

type MessageRow = Database["public"]["Tables"]["conversation_messages"]["Row"];

const ROLE_ORDER: Record<string, number> = {
  USER: 0,
  CHARACTER: 1,
  SYSTEM_EVENT: 2,
};

/** Stable chronology: turn order, then player before character, then timestamp/id. */
export function sortConversationMessages<T extends Pick<MessageRow, "turn_index" | "role" | "created_at" | "id">>(
  messages: T[],
): T[] {
  return [...messages].sort((a, b) => {
    if (a.turn_index !== b.turn_index) return a.turn_index - b.turn_index;

    const roleDelta = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    if (roleDelta !== 0) return roleDelta;

    const timeDelta = a.created_at.localeCompare(b.created_at);
    if (timeDelta !== 0) return timeDelta;

    return a.id.localeCompare(b.id);
  });
}
