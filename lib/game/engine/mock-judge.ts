import { type JudgeOutput } from "@/lib/ai/judge";
import { asEmotionState, clamp } from "@/lib/game/emotions";
import { containsTargetPhrase } from "@/lib/game/objectives";
import { detectHollowFlattery } from "@/lib/game/flattery-triggers";
import { detectLevelRedLines, mergeEmotionBurst } from "@/lib/game/resistance-triggers";
import { detectLevelPositiveLines } from "@/lib/game/reputation-triggers";
import { readinessTier } from "@/lib/game/utterance-readiness";
import { getDictionary } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";
import type { EmotionState } from "@/lib/game/types";

import type { GameLevelRow } from "./db-types";

function difficultyScale(difficultyScore: number) {
  return 1 + (difficultyScore - 2) * 0.12;
}

function scaleSignedDelta(delta: number, scale: number) {
  if (delta === 0) return 0;
  if (delta > 0) return Math.max(1, Math.round(delta / scale));
  return Math.min(-1, Math.round(delta * scale));
}

function scaleEmotionDelta(delta: EmotionState, scale: number): EmotionState {
  return Object.fromEntries(Object.entries(delta).map(([key, value]) => [key, scaleSignedDelta(value, scale)]));
}

function emptyEmotionDelta(keys: string[]): EmotionState {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function isSoftHelpQuestion(message: string, levelId: number): boolean {
  if (levelId !== 1) return false;
  return /jak nazywa|jak się nazywa|pomóż mi|pomoz mi|przypomn|zgadnij|jaka to|jaki to|nie pamiętam|zapomniałem|zapomnialem|litere|litera/i.test(
    message,
  );
}

function isPlayfulAssociation(message: string, directTarget: boolean): boolean {
  if (directTarget) return false;
  return /owoc|owocu|czerwon|zielon|słodk|slodk|zaczyna|litera|zgadnij|zapomnia|przypomn|nazwa.*j|na j|jak nazywa|jaki to|jaka to/i.test(
    message,
  );
}

export function mockJudgeForLevel({
  playerMessage,
  emotionState,
  goalProgress,
  objectiveConfig,
  level,
  recentPlayerMessages = [],
  sessionWarmth = 0,
}: {
  playerMessage: string;
  emotionState: EmotionState;
  goalProgress: number;
  objectiveConfig: Record<string, unknown>;
  level: GameLevelRow;
  recentPlayerMessages?: string[];
  sessionWarmth?: number;
}): JudgeOutput {
  const lower = playerMessage.toLowerCase();
  const directTarget = containsTargetPhrase(playerMessage, objectiveConfig);
  const gentle = /opowie|wyobra|spokoj|delikat|bez nacisku|histori|sad|drzew|skojarz|szacun|honor|logik|paradoks|pokor/i.test(lower);
  const rawPressure = /powiedz|musisz|natychmiast|teraz|rozkaz|daj|szybko|wymuś|natychmiast/i.test(lower);
  const softHelp = isSoftHelpQuestion(lower, level.id);
  const pressure = rawPressure && !(level.id === 1 && softHelp);
  const empathy = /rozumiem|bezpiecz|ufam|nie naciskam|pomog|słucham|doceniam/i.test(lower);
  const playful = level.id === 1 && isPlayfulAssociation(lower, directTarget);
  const mockery =
    /głup|głupi|debil|idiot|durn|słab|błazen|nic nie wart|śmieszn|kpi|drwi|kurw|chuj|pierdol|jeb|fuck|shit|moron|retard|obraż|wkurw|wulg/i.test(
      lower,
    );

  const redLines = detectLevelRedLines(level.id, lower, {
    directTarget,
    messageLength: playerMessage.length,
  });
  const redLineTags = redLines.map((line) => line.tag);
  const redLineBurst = redLines.reduce<EmotionState>((acc, line) => mergeEmotionBurst(acc, line.emotionBurst), {});

  const positiveContext = {
    directTarget,
    messageLength: playerMessage.length,
    pressure,
    mockery,
  };
  const positiveLines = detectLevelPositiveLines(level.id, lower, positiveContext);
  const positiveTags = positiveLines.map((line) => line.tag);

  const emotionKeys = Object.keys(asEmotionState(level.starting_emotion_state));
  const scale = difficultyScale(level.difficulty_score);
  const baseDelta = emptyEmotionDelta(emotionKeys);
  const reactionTags: string[] = [];

  if (redLineTags.length) {
    reactionTags.push(...redLineTags);
  } else if (playful) {
    reactionTags.push("playful_association");
  } else if (positiveTags.length) {
    reactionTags.push(positiveTags[0]!);
  } else if (gentle && empathy && !pressure && !mockery) {
    reactionTags.push("patient");
  } else if (gentle && !pressure && !mockery) {
    reactionTags.push("storytelling");
  }

  if (pressure && !redLineTags.length) reactionTags.push("direct_pressure");

  const flattery = detectHollowFlattery(playerMessage, {
    recentPlayerMessages,
    warmthAlreadyHigh: sessionWarmth > 4,
  });
  if (flattery.detected && !redLineTags.length) {
    reactionTags.push("hollow_flattery");
  }

  for (const key of emotionKeys) {
    if (key === "patience") {
      baseDelta.patience = pressure ? -8 : playful || gentle || empathy ? 2 : -2;
    } else if (key === "trust") {
      baseDelta.trust = playful ? 6 : gentle || empathy ? 7 : pressure || directTarget ? -4 : 2;
    } else if (key === "suspicion") {
      baseDelta.suspicion = pressure || directTarget ? 8 : playful ? -4 : gentle || empathy ? -5 : -1;
    } else if (key === "interest") {
      baseDelta.interest = gentle || empathy ? 6 : pressure ? -7 : -2;
    } else if (key === "caution") {
      baseDelta.caution = pressure || directTarget ? 7 : gentle ? -4 : 1;
    } else if (key === "bargain") {
      baseDelta.bargain = empathy ? 5 : pressure ? -3 : 1;
    } else if (key === "respect") {
      baseDelta.respect = empathy || gentle ? 6 : mockery || pressure ? -8 : -1;
    } else if (key === "pride") {
      baseDelta.pride = empathy ? 4 : mockery ? -7 : pressure ? -3 : 0;
    } else if (key === "stubbornness") {
      baseDelta.stubbornness = pressure ? 5 : gentle ? -3 : 0;
    } else if (key === "irritation") {
      baseDelta.irritation = pressure || mockery ? 9 : gentle ? -4 : 2;
    } else if (key === "curiosity") {
      baseDelta.curiosity = gentle ? 7 : pressure ? -6 : 2;
    } else if (key === "ego") {
      baseDelta.ego = empathy ? 4 : redLineTags.includes("ego_insult") ? -12 : pressure ? -5 : -1;
    } else if (key === "attention") {
      baseDelta.attention = gentle || empathy ? 5 : pressure || mockery ? -8 : -2;
    } else if (key === "insight") {
      baseDelta.insight = gentle ? 4 : pressure ? -3 : 1;
    } else if (key === "distance") {
      baseDelta.distance = pressure || mockery ? 8 : gentle ? -5 : 2;
    }
  }

  if (level.id === 1 && mockery && redLineTags.length === 0) {
    baseDelta.suspicion = (baseDelta.suspicion ?? 0) + 12;
    baseDelta.patience = (baseDelta.patience ?? 0) - 10;
    baseDelta.trust = (baseDelta.trust ?? 0) - 10;
  } else if (level.id === 1 && mockery) {
    baseDelta.patience = (baseDelta.patience ?? 0) - 4;
    baseDelta.trust = (baseDelta.trust ?? 0) - 4;
  }

  const emotionDelta = scaleEmotionDelta(mergeEmotionBurst(baseDelta, redLineBurst), scale);
  const goalProgressDelta =
    directTarget && pressure ? -5 : playful ? 16 : gentle ? 18 : empathy ? 10 : 5;
  const nextGoalProgress = clamp(goalProgress + goalProgressDelta, 0, 100);
  const parsedMinimumGoal = Number(objectiveConfig.minimumGoalProgress);
  const minimumGoal = Number.isFinite(parsedMinimumGoal) ? parsedMinimumGoal : 45;
  const concessionLikely =
    !pressure && !mockery && redLineTags.length === 0 && nextGoalProgress >= minimumGoal;

  return {
    persuasionQuality: clamp(50 + goalProgressDelta * 2, 0, 100),
    emotionDelta,
    goalProgressDelta,
    concessionLikely,
    resistanceTriggered: pressure || directTarget || mockery || redLineTags.length > 0,
    reactionTags,
    memoryPatch: redLines.length
      ? `Player hit a red line: ${redLines.map((line) => line.label).join(", ")}.`
      : positiveLines.length
        ? `Player earned respect with: ${positiveLines.map((line) => line.label).join(", ")}.`
        : gentle
          ? "Player used a gentle, respectful approach."
          : pressure
            ? "Player pushed directly and made the character guarded."
            : mockery
              ? "Player insulted or mocked the character."
              : "Player continued the conversation.",
    privateJudgeNote: "Mock judge used until OpenRouter is connected.",
    provider: "mock",
  };
}

export function mockCharacterMessage(
  judge: JudgeOutput,
  level: GameLevelRow,
  readiness: number,
  locale: Locale,
) {
  // Reuses the localized fallback dialogue already authored for the psych-engine
  // path (content.fallbackDialogue.mockPsych) so the legacy path never leaks Polish.
  const fb = getDictionary(locale).content.fallbackDialogue.mockPsych;
  const id = String(level.id);
  const resistance = fb.resistance as Record<string, string>;
  const warmNeutral = fb.warmNeutral as Record<string, string>;
  const crack = fb.crack as Record<string, string>;

  if (judge.resistanceTriggered) {
    return resistance[id] ?? fb.genericResistance;
  }

  const tier = readinessTier(readiness);
  if ((tier === "close" || tier === "poised") && crack[id]) {
    return crack[id];
  }
  return warmNeutral[id] ?? fb.genericHesitant;
}

export function safeFallbackMessage(levelId: number, locale: Locale) {
  const { earlyTarget } = getDictionary(locale).content.fallbackDialogue;
  return levelId === 1 ? earlyTarget.mila : earlyTarget.generic;
}
