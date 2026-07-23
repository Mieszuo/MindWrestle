import { MEMORY_SUMMARY_MAX_LENGTH, SHORT_TERM_TRACE_DECAY } from "@/lib/game/psychology/config";
import type { MemoryTrace, PsychState } from "@/lib/game/psychology/types";

export function mergeRelationshipSummary(previous: string, patch: string): string {
  const prev = previous.trim();
  const next = patch.trim();
  if (!next) return prev;
  if (!prev) return next.slice(0, MEMORY_SUMMARY_MAX_LENGTH);
  const merged = `${prev} ${next}`.trim();
  if (merged.length <= MEMORY_SUMMARY_MAX_LENGTH) return merged;
  return next.slice(0, MEMORY_SUMMARY_MAX_LENGTH);
}

export function decayMemoryTraces(traces: MemoryTrace[]): MemoryTrace[] {
  return traces
    .map((trace) => ({ ...trace, weight: trace.weight * SHORT_TERM_TRACE_DECAY }))
    .filter((trace) => trace.weight >= 5);
}

export function addMemoryTrace(
  traces: MemoryTrace[],
  turn: number,
  summary: string,
  weight = 60,
  tag?: string,
): MemoryTrace[] {
  const next = decayMemoryTraces(traces);
  next.push({ turn, summary, weight, tag });
  return next.slice(-8);
}

export function applyMemoryPatch(state: PsychState, turn: number, patch: string, tag?: string): PsychState {
  if (!patch.trim()) return state;
  return {
    ...state,
    relationshipSummary: mergeRelationshipSummary(state.relationshipSummary, patch),
    memoryTraces: addMemoryTrace(state.memoryTraces, turn, patch, 60, tag),
  };
}

export function memoryWeightBonus(traces: MemoryTrace[]): number {
  return traces.reduce((sum, trace) => sum + trace.weight * 0.02, 0);
}
