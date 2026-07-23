import type { Json } from "@/lib/supabase/database.types";

export interface LocalNpcRelation {
  affinity: number;
  resentment: number;
  familiarity: number;
  lastOutcome: "won" | "failed" | "broke" | null;
  memorySnippet: string | null;
}

export function defaultLocalNpcRelation(): LocalNpcRelation {
  return {
    affinity: 0,
    resentment: 0,
    familiarity: 0,
    lastOutcome: null,
    memorySnippet: null,
  };
}

export function parseNpcRelations(raw: Json | null | undefined): Record<string, LocalNpcRelation> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, LocalNpcRelation> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    result[key] = {
      affinity: clamp(Number(record.affinity) || 0, -100, 100),
      resentment: clamp(Number(record.resentment) || 0, 0, 100),
      familiarity: clamp(Number(record.familiarity) || 0, 0, 100),
      lastOutcome:
        record.lastOutcome === "won" || record.lastOutcome === "failed" || record.lastOutcome === "broke"
          ? record.lastOutcome
          : null,
      memorySnippet: typeof record.memorySnippet === "string" ? record.memorySnippet : null,
    };
  }

  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getLocalNpcRelation(
  relations: Record<string, LocalNpcRelation>,
  levelId: number,
): LocalNpcRelation {
  return relations[String(levelId)] ?? defaultLocalNpcRelation();
}

export function updateLocalNpcRelation(
  relations: Record<string, LocalNpcRelation>,
  levelId: number,
  patch: Partial<LocalNpcRelation>,
): Record<string, LocalNpcRelation> {
  const key = String(levelId);
  const current = getLocalNpcRelation(relations, levelId);
  return {
    ...relations,
    [key]: {
      ...current,
      ...patch,
      affinity: clamp(patch.affinity ?? current.affinity, -100, 100),
      resentment: clamp(patch.resentment ?? current.resentment, 0, 100),
      familiarity: clamp(patch.familiarity ?? current.familiarity, 0, 100),
    },
  };
}

export function npcRelationsToJson(relations: Record<string, LocalNpcRelation>): Json {
  return relations as unknown as Json;
}

export function relationPatchAfterAttempt(
  completed: boolean,
  defeated: boolean,
  pressureTags: string[],
): Partial<LocalNpcRelation> {
  if (completed) {
    return {
      affinity: 15,
      resentment: Math.max(0, pressureTags.length * 3 - 5),
      familiarity: 1,
      lastOutcome: "won",
    };
  }
  if (defeated) {
    return {
      affinity: -10,
      resentment: 12,
      familiarity: 1,
      lastOutcome: "failed",
    };
  }
  return { familiarity: 1 };
}
