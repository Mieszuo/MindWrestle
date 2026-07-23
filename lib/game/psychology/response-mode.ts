import { OBJECTIVE_THRESHOLDS, objectiveThresholdsForLevel } from "@/lib/game/psychology/config";
import { councilScore } from "@/lib/game/psychology/inner-council";
import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import { memoryWeightBonus } from "@/lib/game/psychology/memory";
import type { InnerVote, PsychState, ResponseMode } from "@/lib/game/psychology/types";

const RESPONSE_MODE_ORDER: ResponseMode[] = [
  "full_resistance",
  "defensive_deflection",
  "crack_in_armor",
  "partial_concession",
  "full_reveal",
];

function responseModeRank(mode: ResponseMode): number {
  return RESPONSE_MODE_ORDER.indexOf(mode);
}

function normalizeAgentKey(agent: string) {
  return agent.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function mergeCouncilVotes(serverVotes: InnerVote[], llmVotes?: InnerVote[]): InnerVote[] {
  if (!llmVotes?.length) return serverVotes;

  const serverByAgent = new Map(serverVotes.map((vote) => [normalizeAgentKey(vote.agent), vote]));
  const merged: InnerVote[] = [];
  const seen = new Set<string>();

  for (const llmVote of llmVotes) {
    const key = normalizeAgentKey(llmVote.agent);
    const serverVote = serverByAgent.get(key);
    if (serverVote) {
      merged.push({
        agent: serverVote.agent,
        stance: Math.min(100, Math.max(-100, Math.round(serverVote.stance * 0.55 + llmVote.stance * 0.45))),
        reason: llmVote.reason || serverVote.reason,
      });
      seen.add(key);
      continue;
    }
    merged.push(llmVote);
  }

  for (const serverVote of serverVotes) {
    const key = normalizeAgentKey(serverVote.agent);
    if (!seen.has(key)) merged.push(serverVote);
  }

  return merged;
}

export function resolveFinalResponseMode(
  levelId: number,
  psychState: PsychState,
  serverVotes: InnerVote[],
  llmVotes?: InnerVote[],
): ResponseMode {
  const serverMode = decideResponseMode(levelId, psychState, serverVotes);
  if (!llmVotes?.length) return serverMode;

  const mergedVotes = mergeCouncilVotes(serverVotes, llmVotes);
  const llmMode = decideResponseMode(levelId, psychState, mergedVotes);
  const serverRank = responseModeRank(serverMode);
  const llmRank = responseModeRank(llmMode);

  if (llmRank < serverRank) return llmMode;
  const cappedRank = Math.min(llmRank, serverRank + 1);
  return RESPONSE_MODE_ORDER[cappedRank] ?? serverMode;
}


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeBeliefResistance(psychState: PsychState): number {
  if (!psychState.beliefs.length) return 50;
  const avg = psychState.beliefs.reduce((sum, belief) => sum + belief.confidence, 0) / psychState.beliefs.length;
  return avg;
}

export function computeResponseScore(
  levelId: number,
  psychState: PsychState,
  councilVotes: InnerVote[],
): number {
  const profile = getLevelPsychProfile(levelId);
  const pressure =
    profile.objectiveAxis === "beliefShift" ? psychState.axes.beliefShift : psychState.axes.secretPressure;
  const council = councilScore(councilVotes);
  const unconsciousBoost = psychState.unconscious.doubt * 0.25 + psychState.unconscious.guilt * 0.15;
  const social = psychState.axes.socialOpenness * 0.15;
  const defense = psychState.axes.identityDefense * 0.35;
  const beliefResistance = computeBeliefResistance(psychState) * 0.2;
  const memory = memoryWeightBonus(psychState.memoryTraces);
  const threshold = psychState.thresholdBias;

  return clamp(
    pressure * 0.45 + council * 0.25 + unconsciousBoost + social - defense - beliefResistance + memory - threshold,
    -100,
    100,
  );
}

export function decideResponseMode(levelId: number, psychState: PsychState, councilVotes: InnerVote[]): ResponseMode {
  const thresholds = objectiveThresholdsForLevel(levelId);
  const score = computeResponseScore(levelId, psychState, councilVotes) + thresholds.responseScoreBonus;

  if (score < -15) return "full_resistance";
  if (score < 15) return "defensive_deflection";
  if (score < 40) return "crack_in_armor";
  if (score < thresholds.pressureMinimum + 10) return "partial_concession";
  return "full_reveal";
}

export function forbiddenDirectReveal(mode: ResponseMode): boolean {
  return mode === "full_resistance" || mode === "defensive_deflection";
}
