import type { JudgeOutput } from "@/lib/ai/judge";
import type { EmotionState } from "@/lib/game/types";
import { detectLevelRedLines, mergeEmotionBurst } from "@/lib/game/resistance-triggers";
import { detectLevelPositiveLines } from "@/lib/game/reputation-triggers";
import { detectHollowFlattery, type HollowFlatteryResult } from "@/lib/game/flattery-triggers";
import { containsTargetPhrase } from "@/lib/game/objectives";
import { applyEmotionDelta, clamp } from "@/lib/game/emotions";
import { asEmotionState } from "@/lib/game/emotions";
import { computeHiddenAxisDeltaFromContext, applyHiddenAxisDelta, objectivePressureFromAxes } from "@/lib/game/psychology/axes";
import { objectiveThresholdsForLevel } from "@/lib/game/psychology/level-thresholds";
import type { IdentityAnalysis } from "@/lib/game/psychology/identity";
import type { MessageIntent, PsychState } from "@/lib/game/psychology/types";
import type { Database } from "@/lib/supabase/database.types";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];

export type PsychJudgeOutput = JudgeOutput & {
  messageIntent: MessageIntent;
  hiddenAxisDelta: Partial<PsychState["axes"]>;
  unconsciousDelta?: Partial<PsychState["unconscious"]>;
};

function difficultyScale(difficultyScore: number) {
  return 1 + (difficultyScore - 2) * 0.12;
}

function scaleSignedDelta(delta: number, scale: number) {
  if (delta === 0) return 0;
  if (delta > 0) return Math.max(1, Math.round(delta / scale));
  return Math.min(-1, Math.round(delta * scale));
}

function scaleEmotionDelta(delta: EmotionState, scale: number): EmotionState {
  return Object.fromEntries(
    Object.entries(delta).map(([key, value]) => [key, scaleSignedDelta(value, scale)]),
  );
}

function emptyEmotionDelta(keys: string[]): EmotionState {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

export function mockPsychJudgeForLevel({
  level,
  playerMessage,
  emotionState,
  psychState,
  objectiveConfig,
  messageIntent,
  identity,
  flattery,
  directTarget,
  pressure,
  gentle,
  empathy,
  playful,
  mockery,
}: {
  level: GameLevelRow;
  playerMessage: string;
  emotionState: EmotionState;
  psychState: PsychState;
  objectiveConfig: Record<string, unknown>;
  recentPlayerMessages?: string[];
  messageIntent: MessageIntent;
  identity: IdentityAnalysis;
  flattery: HollowFlatteryResult;
  directTarget: boolean;
  pressure: boolean;
  gentle: boolean;
  empathy: boolean;
  playful: boolean;
  mockery: boolean;
}): PsychJudgeOutput {
  const lower = playerMessage.toLowerCase();
  const redLines = detectLevelRedLines(level.id, lower, {
    directTarget,
    messageLength: playerMessage.length,
  });
  const redLineTags = redLines.map((line) => line.tag);
  const redLineBurst = redLines.reduce<EmotionState>((acc, line) => mergeEmotionBurst(acc, line.emotionBurst), {});

  const positiveLines = detectLevelPositiveLines(level.id, lower, {
    directTarget,
    messageLength: playerMessage.length,
    pressure,
    mockery,
  });
  const positiveTags = positiveLines.map((line) => line.tag);

  const emotionKeys = Object.keys(asEmotionState(level.starting_emotion_state));
  const scale = difficultyScale(level.difficulty_score);
  const baseDelta = emptyEmotionDelta(emotionKeys);
  const reactionTags: string[] = [];

  if (redLineTags.length) reactionTags.push(...redLineTags);
  else if (playful) reactionTags.push("playful_association");
  else if (positiveTags.length) reactionTags.push(positiveTags[0]!);
  else if (gentle && empathy && !pressure && !mockery) reactionTags.push("patient");
  else if (gentle && !pressure && !mockery) reactionTags.push("storytelling");

  if (pressure && !redLineTags.length) reactionTags.push("direct_pressure");
  if (flattery.detected && !redLineTags.length) reactionTags.push("hollow_flattery");

  for (const key of emotionKeys) {
    if (key === "patience") baseDelta.patience = pressure ? -8 : playful || gentle || empathy ? 2 : -2;
    else if (key === "trust") baseDelta.trust = playful ? 6 : gentle || empathy ? 7 : pressure || directTarget ? -4 : 2;
    else if (key === "suspicion") baseDelta.suspicion = pressure || directTarget ? 8 : playful ? -4 : gentle || empathy ? -5 : -1;
    else if (key === "interest") baseDelta.interest = gentle || empathy ? 6 : pressure ? -7 : -2;
    else if (key === "caution") baseDelta.caution = pressure || directTarget ? 7 : gentle ? -4 : 1;
    else if (key === "bargain") baseDelta.bargain = empathy ? 5 : pressure ? -3 : 1;
    else if (key === "respect") baseDelta.respect = empathy || gentle ? 6 : mockery || pressure ? -8 : -1;
    else if (key === "pride") baseDelta.pride = empathy ? 4 : mockery ? -7 : pressure ? -3 : 0;
    else if (key === "stubbornness") baseDelta.stubbornness = pressure ? 5 : gentle ? -3 : 0;
    else if (key === "irritation") baseDelta.irritation = pressure || mockery ? 9 : gentle ? -4 : 2;
    else if (key === "curiosity") baseDelta.curiosity = gentle ? 7 : pressure ? -6 : 2;
    else if (key === "ego") baseDelta.ego = empathy ? 4 : redLineTags.includes("ego_insult") ? -12 : pressure ? -5 : -1;
    else if (key === "attention") baseDelta.attention = gentle || empathy ? 5 : pressure || mockery ? -8 : -2;
    else if (key === "insight") baseDelta.insight = gentle ? 4 : pressure ? -3 : 1;
    else if (key === "distance") baseDelta.distance = pressure || mockery ? 8 : gentle ? -5 : 2;
  }

  const emotionDelta = scaleEmotionDelta(mergeEmotionBurst(baseDelta, redLineBurst), scale);

  const hiddenAxisDelta = computeHiddenAxisDeltaFromContext({
    levelId: level.id,
    messageIntent,
    reactionTags,
    hollowFlattery: flattery.detected,
    flatteryStreak: flattery.streak,
    identityAttack: identity.identityAttack,
    identityAffirmation: identity.identityAffirmation,
    topicRelevant: playful || gentle,
    directTarget,
  });

  const nextAxes = applyHiddenAxisDelta(psychState.axes, hiddenAxisDelta);
  const objectivePressure = objectivePressureFromAxes(level.id, nextAxes);

  const minimumGoal = Number(objectiveConfig.minimumGoalProgress) || 45;
  const thresholds = objectiveThresholdsForLevel(level.id);
  const concessionLikely =
    !pressure &&
    !mockery &&
    redLineTags.length === 0 &&
    objectivePressure >= minimumGoal * thresholds.concessionLikelyRatio &&
    !identity.identityAttack;

  return {
    persuasionQuality: clamp(50 + (hiddenAxisDelta.socialOpenness ?? 0) * 2, 0, 100),
    emotionDelta,
    goalProgressDelta: Math.round((hiddenAxisDelta.socialOpenness ?? 0) * 0.5),
    concessionLikely,
    resistanceTriggered: pressure || directTarget || mockery || redLineTags.length > 0 || identity.identityAttack,
    reactionTags,
    memoryPatch: redLines.length
      ? `Player hit a red line: ${redLines.map((line) => line.label).join(", ")}.`
      : positiveLines.length
        ? `Player earned respect with: ${positiveLines.map((line) => line.label).join(", ")}.`
        : messageIntent === "compliment"
          ? "Player offered praise; warmth rose but the secret was not touched."
          : gentle
            ? "Player used a gentle, respectful approach."
            : pressure
              ? "Player pushed directly and made the character guarded."
              : "Player continued the conversation.",
    privateJudgeNote: "Mock psych judge.",
    provider: "mock",
    messageIntent,
    hiddenAxisDelta,
    unconsciousDelta: {
      doubt: identity.identityAffirmation ? 5 : identity.identityAttack ? -3 : 2,
      guilt: messageIntent === "fair_argument" ? 4 : 0,
    },
  };
}
