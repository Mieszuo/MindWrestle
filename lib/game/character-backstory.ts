/** Narrative backstory from game_levels.character_config — for AI prompts only. */
export function backstoryForPrompt(characterConfig: unknown): string {
  if (!characterConfig || typeof characterConfig !== "object" || Array.isArray(characterConfig)) {
    return "";
  }

  const record = characterConfig as Record<string, unknown>;
  const backstory = record.backstory;
  if (!backstory || typeof backstory !== "object" || Array.isArray(backstory)) {
    return "";
  }

  const parts: string[] = [];
  const bs = backstory as Record<string, unknown>;

  if (typeof bs.public === "string" && bs.public.trim()) {
    parts.push(`Public (player may know): ${bs.public.trim()}`);
  }
  if (typeof bs.wound === "string" && bs.wound.trim()) {
    parts.push(`Hidden wound (NPC only): ${bs.wound.trim()}`);
  }
  if (typeof bs.conversationNotes === "string" && bs.conversationNotes.trim()) {
    parts.push(`Roleplay notes: ${bs.conversationNotes.trim()}`);
  }

  return parts.join("\n");
}
