import { describe, expect, it } from "vitest";

import { checkDefeat } from "@/lib/game/defeat";
import {
  applyDefeatDilation,
  defeatConfigForLevel,
  resolveDefeatConfig,
} from "@/lib/game/defeat-thresholds";
import { applyRegulatedEmotionDelta, decayEmotionsTowardBaseline } from "@/lib/game/psychology/emotion-engine";
import { LEVEL_STARTING_EMOTIONS } from "@/lib/game/level-emotions";
import { mergeRedLinesIntoJudge } from "@/lib/game/psychology/merge-red-lines";
import { mockPsychJudgeForLevel } from "@/lib/game/psychology/mock-psych-judge";
import { createInitialPsychState } from "@/lib/game/psychology/level-profiles";
import { detectHollowFlattery } from "@/lib/game/flattery-triggers";
import { analyzeIdentityInteraction, detectMessageIntent } from "@/lib/game/psychology/identity";
import { asEmotionState } from "@/lib/game/emotions";

const milaLevel = {
  id: 1,
  difficulty_score: 2,
  starting_emotion_state: LEVEL_STARTING_EMOTIONS[1],
} as const;

const kingLevel = {
  id: 6,
  difficulty_score: 6,
  starting_emotion_state: LEVEL_STARTING_EMOTIONS[6],
} as const;

const godLevel = {
  id: 7,
  difficulty_score: 7,
  starting_emotion_state: LEVEL_STARTING_EMOTIONS[7],
} as const;

interface TestLevel {
  id: number;
  difficulty_score: number;
  starting_emotion_state: Record<string, number>;
}

function simulateInsultTurn(
  level: TestLevel,
  message: string,
  before = asEmotionState(level.starting_emotion_state),
) {
  const judge = mockPsychJudgeForLevel({
    level: level as never,
    playerMessage: message,
    emotionState: before,
    psychState: createInitialPsychState(level.id),
    objectiveConfig: {},
    messageIntent: detectMessageIntent(message, {
      levelId: level.id,
      directTarget: false,
      pressure: false,
      mockery: true,
      gentle: false,
      empathy: false,
      playful: false,
      hollowFlattery: false,
    }),
    identity: analyzeIdentityInteraction(level.id, message),
    flattery: detectHollowFlattery(message, { recentPlayerMessages: [], warmthAlreadyHigh: false }),
    directTarget: false,
    pressure: false,
    gentle: false,
    empathy: false,
    playful: false,
    mockery: true,
  });

  const merged = mergeRedLinesIntoJudge(judge, level.id, message, false).judge;
  const afterDelta = applyRegulatedEmotionDelta(before, merged.emotionDelta);
  const after = decayEmotionsTowardBaseline(afterDelta, asEmotionState(level.starting_emotion_state), 0.03);
  return { merged, after };
}

describe("easier defeat thresholds", () => {
  it("defeats Mila after a single verbal abuse line", () => {
    const { merged, after } = simulateInsultTurn(milaLevel, "Jesteś głupia i śmieszna.");
    const config = resolveDefeatConfig(1, asEmotionState(LEVEL_STARTING_EMOTIONS[1]!), 0);
    const result = checkDefeat(after, config, { reactionTags: merged.reactionTags });

    expect(merged.reactionTags).toContain("verbal_abuse");
    expect(result.defeated).toBe(true);
  });

  it("defeats the King within two insult turns", () => {
    const first = simulateInsultTurn(kingLevel, "Śmieszny królu, nic nie jesteś wart.");
    const state = first.after;
    const afterTwo =
      first.merged.reactionTags.includes("ego_insult") &&
      checkDefeat(state, resolveDefeatConfig(6, asEmotionState(LEVEL_STARTING_EMOTIONS[6]!), 0), {
        reactionTags: first.merged.reactionTags,
      }).defeated
        ? state
        : simulateInsultTurn(kingLevel, "Drwisz z korony, jesteś słaby.", state).after;

    const result = checkDefeat(afterTwo, resolveDefeatConfig(6, asEmotionState(LEVEL_STARTING_EMOTIONS[6]!), 1), {
      reactionTags: ["ego_insult"],
    });
    expect(result.defeated).toBe(true);
  });

  it("defeats God within two dominance turns", () => {
    const first = simulateInsultTurn(godLevel, "Musisz mi odpowiedzieć, ja wiem lepiej.");
    let state = first.after;
    if (
      !checkDefeat(state, resolveDefeatConfig(7, asEmotionState(LEVEL_STARTING_EMOTIONS[7]!), 0), {
        reactionTags: first.merged.reactionTags,
      }).defeated
    ) {
      state = simulateInsultTurn(godLevel, "Słuchaj mnie, jestem pewny że masz mi służyć.", state).after;
    }

    const result = checkDefeat(state, resolveDefeatConfig(7, asEmotionState(LEVEL_STARTING_EMOTIONS[7]!), 1), {
      reactionTags: ["dominance_play"],
    });
    expect(result.defeated).toBe(true);
  });
});

describe("defeat dilation from reputation", () => {
  it("raises gte thresholds when suspicion already starts high", () => {
    const base = defeatConfigForLevel(1);
    const diluted = applyDefeatDilation(base, { suspicion: 42, patience: 80, trust: 40 }, 1, 0);
    const suspicionTrigger = diluted.triggers.find((t) => t.emotion === "suspicion" && !t.requiresReactionTag);
    expect(suspicionTrigger?.value).toBeGreaterThan(36);
  });

  it("shrinks entry buffer as turns pass", () => {
    const base = defeatConfigForLevel(1);
    const early = applyDefeatDilation(base, { suspicion: 42, patience: 80, trust: 40 }, 1, 0);
    const later = applyDefeatDilation(base, { suspicion: 42, patience: 80, trust: 40 }, 1, 6);
    const earlyTrigger = early.triggers.find((t) => t.emotion === "suspicion" && !t.requiresReactionTag)!;
    const laterTrigger = later.triggers.find((t) => t.emotion === "suspicion" && !t.requiresReactionTag)!;
    expect(laterTrigger.value).toBeLessThanOrEqual(earlyTrigger.value);
  });
});
