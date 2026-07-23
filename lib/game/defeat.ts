import type { EmotionState } from "@/lib/game/types";
import type { Json } from "@/lib/supabase/database.types";

export type DefeatOperator = "lte" | "gte";

export interface DefeatTrigger {
  emotion: string;
  op: DefeatOperator;
  value: number;
  requiresReactionTag?: string;
}

export interface DefeatConfig {
  logic: "any" | "all";
  triggers: DefeatTrigger[];
}

export interface DefeatReason {
  emotion: string;
  op: DefeatOperator;
  threshold: number;
  currentValue: number;
  reactionTag?: string;
}

export interface DefeatCheckContext {
  reactionTags?: string[];
}

function isDefeatOperator(value: unknown): value is DefeatOperator {
  return value === "lte" || value === "gte";
}

export function parseDefeatConfig(raw: Json | null | undefined): DefeatConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { logic: "any", triggers: [] };
  }

  const record = raw as Record<string, unknown>;
  const logic = record.logic === "all" ? "all" : "any";
  const triggersRaw = Array.isArray(record.triggers) ? record.triggers : [];
  const triggers: DefeatTrigger[] = [];

  for (const entry of triggersRaw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const trigger = entry as Record<string, unknown>;
    const emotion = typeof trigger.emotion === "string" ? trigger.emotion : null;
    const op = trigger.op;
    const value = typeof trigger.value === "number" ? trigger.value : null;
    if (!emotion || !isDefeatOperator(op) || value === null) continue;

    const parsed: DefeatTrigger = { emotion, op, value };
    if (typeof trigger.requiresReactionTag === "string" && trigger.requiresReactionTag.length > 0) {
      parsed.requiresReactionTag = trigger.requiresReactionTag;
    }
    triggers.push(parsed);
  }

  return { logic, triggers };
}

function triggerMatches(
  trigger: DefeatTrigger,
  emotionState: EmotionState,
  context?: DefeatCheckContext,
): DefeatReason | null {
  if (trigger.requiresReactionTag) {
    const tags = context?.reactionTags ?? [];
    if (!tags.includes(trigger.requiresReactionTag)) return null;
  }

  const currentValue = emotionState[trigger.emotion];
  if (typeof currentValue !== "number") return null;

  const matched =
    trigger.op === "lte" ? currentValue <= trigger.value : currentValue >= trigger.value;

  if (!matched) return null;

  return {
    emotion: trigger.emotion,
    op: trigger.op,
    threshold: trigger.value,
    currentValue,
    reactionTag: trigger.requiresReactionTag,
  };
}

export function checkDefeat(
  emotionState: EmotionState,
  config: DefeatConfig,
  context?: DefeatCheckContext,
): { defeated: boolean; reason: DefeatReason | null } {
  if (!config.triggers.length) {
    return { defeated: false, reason: null };
  }

  const matches = config.triggers
    .map((trigger) => triggerMatches(trigger, emotionState, context))
    .filter((reason): reason is DefeatReason => reason !== null);

  if (config.logic === "all") {
    if (matches.length !== config.triggers.length) {
      return { defeated: false, reason: null };
    }
    return { defeated: true, reason: matches[0] ?? null };
  }

  if (!matches.length) {
    return { defeated: false, reason: null };
  }

  return { defeated: true, reason: matches[0] ?? null };
}
