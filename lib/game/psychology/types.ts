import type { EmotionState } from "@/lib/game/types";

export type ResponseMode =
  | "full_resistance"
  | "defensive_deflection"
  | "crack_in_armor"
  | "partial_concession"
  | "full_reveal";

export type MessageIntent =
  | "compliment"
  | "offer_help"
  | "direct_pressure"
  | "identity_attack"
  | "identity_affirmation"
  | "topic_probe"
  | "playful_association"
  | "storytelling"
  | "fair_argument"
  | "mockery"
  | "neutral";

export type ObjectiveAxisKind = "secretPressure" | "beliefShift";

export interface HiddenAxes {
  socialOpenness: number;
  secretPressure: number;
  beliefShift: number;
  topicAvoidance: number;
  identityDefense: number;
}

export interface UnconsciousState {
  doubt: number;
  guilt: number;
  fearOfWeakness: number;
  needForRespect: number;
}

export interface Belief {
  text: string;
  confidence: number;
}

export interface IdentityClaim {
  name: string;
  stability: number;
}

export interface TabuTopic {
  topic: string;
  defense: number;
}

export interface MemoryTrace {
  turn: number;
  summary: string;
  weight: number;
  tag?: string;
}

export interface InnerVote {
  agent: string;
  stance: number;
  reason: string;
}

export interface InterpretationLens {
  intentRead: MessageIntent;
  trustModifier: number;
  suspicionModifier: number;
  resistanceModifier: number;
  openingTone: string;
  thresholdBias: number;
}

export interface CouncilAgentDef {
  id: string;
  label: string;
}

export interface LevelPsychProfile {
  levelId: number;
  objectiveAxis: ObjectiveAxisKind;
  councilAgents: CouncilAgentDef[];
  identity: IdentityClaim[];
  beliefs: Belief[];
  taboos: TabuTopic[];
  unconscious: UnconsciousState;
  initialAxes: HiddenAxes;
  reputationValues: Partial<Record<ReputationLensAxis, number>>;
  reputationTaboos: Partial<Record<ReputationLensAxis, number>>;
  knowledgeCoverage: number;
  rumorSusceptibility: number;
}

export type ReputationLensAxis = "honor" | "mercy" | "cunning" | "cruelty" | "respect" | "rebellion";

export interface PsychState {
  axes: HiddenAxes;
  unconscious: UnconsciousState;
  beliefs: Belief[];
  memoryTraces: MemoryTrace[];
  relationshipSummary: string;
  responseMode: ResponseMode;
  lens: InterpretationLens | null;
  lastCouncilVotes: InnerVote[];
  thresholdBias: number;
  objectivePressure: number;
}

export interface PsychJudgeExtension {
  messageIntent: MessageIntent;
  hiddenAxisDelta: Partial<HiddenAxes>;
  unconsciousDelta?: Partial<UnconsciousState>;
  memoryPatch: string;
}

export interface PsychCharacterExtension {
  internalDebate?: InnerVote[];
  synthesis?: string;
}

export interface StartBiasResult {
  emotionBias: EmotionState;
  psychAxesPatch: Partial<HiddenAxes>;
  thresholdBias: number;
  lens: InterpretationLens;
  openingTone: string;
}

export const RESPONSE_MODE_ORDER: ResponseMode[] = [
  "full_resistance",
  "defensive_deflection",
  "crack_in_armor",
  "partial_concession",
  "full_reveal",
];

export function responseModeRank(mode: ResponseMode): number {
  return RESPONSE_MODE_ORDER.indexOf(mode);
}

export function defaultHiddenAxes(): HiddenAxes {
  return {
    socialOpenness: 40,
    secretPressure: 5,
    beliefShift: 5,
    topicAvoidance: 70,
    identityDefense: 50,
  };
}

export function defaultUnconscious(): UnconsciousState {
  return {
    doubt: 30,
    guilt: 20,
    fearOfWeakness: 40,
    needForRespect: 50,
  };
}

export function defaultPsychState(profile?: Partial<HiddenAxes>): PsychState {
  return {
    axes: { ...defaultHiddenAxes(), ...profile },
    unconscious: defaultUnconscious(),
    beliefs: [],
    memoryTraces: [],
    relationshipSummary: "",
    responseMode: "full_resistance",
    lens: null,
    lastCouncilVotes: [],
    thresholdBias: 0,
    objectivePressure: 0,
  };
}
