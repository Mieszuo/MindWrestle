import type { Json } from "@/lib/supabase/database.types";

import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import {
  defaultHiddenAxes,
  defaultPsychState,
  defaultUnconscious,
  type Belief,
  type HiddenAxes,
  type InnerVote,
  type InterpretationLens,
  type MemoryTrace,
  type PsychState,
  type ResponseMode,
  type UnconsciousState,
} from "@/lib/game/psychology/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberAt(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, 0, 100) : fallback;
}

function parseHiddenAxes(raw: unknown): HiddenAxes {
  const defaults = defaultHiddenAxes();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  return {
    socialOpenness: numberAt(record.socialOpenness, defaults.socialOpenness),
    secretPressure: numberAt(record.secretPressure, defaults.secretPressure),
    beliefShift: numberAt(record.beliefShift, defaults.beliefShift),
    topicAvoidance: numberAt(record.topicAvoidance, defaults.topicAvoidance),
    identityDefense: numberAt(record.identityDefense, defaults.identityDefense),
  };
}

function parseUnconscious(raw: unknown): UnconsciousState {
  const defaults = defaultUnconscious();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  return {
    doubt: numberAt(record.doubt, defaults.doubt),
    guilt: numberAt(record.guilt, defaults.guilt),
    fearOfWeakness: numberAt(record.fearOfWeakness, defaults.fearOfWeakness),
    needForRespect: numberAt(record.needForRespect, defaults.needForRespect),
  };
}

function parseMemoryTraces(raw: unknown): MemoryTrace[] {
  if (!Array.isArray(raw)) return [];
  const traces: MemoryTrace[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.summary !== "string") continue;
    traces.push({
      turn: typeof record.turn === "number" ? record.turn : 0,
      summary: record.summary,
      weight: numberAt(record.weight, 50),
      tag: typeof record.tag === "string" ? record.tag : undefined,
    });
  }
  return traces;
}

function parseInnerVotes(raw: unknown): InnerVote[] {
  if (!Array.isArray(raw)) return [];
  const votes: InnerVote[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.agent !== "string") continue;
    votes.push({
      agent: record.agent,
      stance: clamp(Number(record.stance) || 0, -100, 100),
      reason: typeof record.reason === "string" ? record.reason : "",
    });
  }
  return votes;
}

function parseBeliefs(raw: unknown): Belief[] {
  if (!Array.isArray(raw)) return [];
  const beliefs: Belief[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.text !== "string") continue;
    beliefs.push({
      text: record.text,
      confidence: numberAt(record.confidence, 50),
    });
  }
  return beliefs;
}

function parseLens(raw: unknown): InterpretationLens | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.openingTone !== "string") return null;
  return {
    intentRead: (typeof record.intentRead === "string" ? record.intentRead : "neutral") as InterpretationLens["intentRead"],
    trustModifier: Number(record.trustModifier) || 1,
    suspicionModifier: Number(record.suspicionModifier) || 1,
    resistanceModifier: Number(record.resistanceModifier) || 1,
    openingTone: record.openingTone,
    thresholdBias: Number(record.thresholdBias) || 0,
  };
}

const RESPONSE_MODES = new Set([
  "full_resistance",
  "defensive_deflection",
  "crack_in_armor",
  "partial_concession",
  "full_reveal",
]);

export function parsePsychState(
  raw: Json | null | undefined,
  relationshipSummary?: string | null,
  levelId?: number,
): PsychState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const state = defaultPsychState();
    if (relationshipSummary) state.relationshipSummary = relationshipSummary;
    if (levelId) {
      state.beliefs = getLevelPsychProfile(levelId).beliefs.map((belief) => ({ ...belief }));
    }
    return state;
  }

  const record = raw as Record<string, unknown>;
  const axes = parseHiddenAxes(record.axes);
  const responseMode = typeof record.responseMode === "string" && RESPONSE_MODES.has(record.responseMode)
    ? (record.responseMode as ResponseMode)
    : "full_resistance";

  const parsedBeliefs = parseBeliefs(record.beliefs);
  const beliefs =
    parsedBeliefs.length > 0
      ? parsedBeliefs
      : levelId
        ? getLevelPsychProfile(levelId).beliefs.map((belief) => ({ ...belief }))
        : [];

  return {
    axes,
    unconscious: parseUnconscious(record.unconscious),
    beliefs,
    memoryTraces: parseMemoryTraces(record.memoryTraces),
    relationshipSummary:
      typeof record.relationshipSummary === "string"
        ? record.relationshipSummary
        : relationshipSummary ?? "",
    responseMode,
    lens: parseLens(record.lens),
    lastCouncilVotes: parseInnerVotes(record.lastCouncilVotes),
    thresholdBias: Number(record.thresholdBias) || 0,
    objectivePressure: numberAt(record.objectivePressure, axes.secretPressure || axes.beliefShift),
  };
}

export function psychStateToJson(state: PsychState): Json {
  return state as unknown as Json;
}
