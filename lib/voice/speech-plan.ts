import type { ResponseMode } from "@/lib/game/psychology/types";
import type { EmotionState } from "@/lib/game/types";
import { getBaseVoiceDirection } from "@/lib/game/voice-profiles";
import { splitSpeechSentences } from "@/lib/voice/speech-chunks";
import {
  parseVoicePerformance,
  voicePerformanceForResponse,
  type VoiceDirection,
  type VoiceDirectionSource,
  type VoicePerformance,
} from "@/lib/game/voice-performance";

export interface SpeechChunk {
  displayText: string;
  spokenText: string;
  directionSource: VoiceDirectionSource;
}

export interface SpeechPlan {
  displayText: string;
  spokenText: string;
  sentences: string[];
  directionSource: VoiceDirectionSource;
}

export interface SpeechCue {
  displayText: string;
  startMs: number;
  endMs: number;
}

interface BuildSpeechChunkInput {
  displayText: string;
  levelId: number;
  emotions: EmotionState;
  responseMode?: ResponseMode;
  sentenceIndex: number;
  sentenceCount: number;
  voicePerformance?: VoicePerformance;
}

function hasHigh(emotions: EmotionState, keys: string[], threshold = 68) {
  return keys.some((key) => typeof emotions[key] === "number" && emotions[key] >= threshold);
}

function hasLow(emotions: EmotionState, keys: string[], threshold = 35) {
  return keys.some((key) => typeof emotions[key] === "number" && emotions[key] <= threshold);
}

const CHARACTER_MODE_DIRECTIONS: Record<number, Record<ResponseMode, VoiceDirection>> = {
  1: {
    full_resistance: "cautiously",
    defensive_deflection: "hesitantly",
    crack_in_armor: "hesitantly",
    partial_concession: "warmly",
    full_reveal: "softly",
  },
  2: {
    full_resistance: "amused",
    defensive_deflection: "mischievously",
    crack_in_armor: "cautiously",
    partial_concession: "amused",
    full_reveal: "sincerely",
  },
  3: {
    full_resistance: "firmly",
    defensive_deflection: "solemnly",
    crack_in_armor: "quietly",
    partial_concession: "calmly",
    full_reveal: "sincerely",
  },
  4: {
    full_resistance: "angry but controlled",
    defensive_deflection: "firmly",
    crack_in_armor: "quietly",
    partial_concession: "calmly",
    full_reveal: "sincerely",
  },
  5: {
    full_resistance: "calmly",
    defensive_deflection: "cautiously",
    crack_in_armor: "quietly",
    partial_concession: "thoughtfully",
    full_reveal: "solemnly",
  },
  6: {
    full_resistance: "firmly",
    defensive_deflection: "solemnly",
    crack_in_armor: "quietly",
    partial_concession: "calmly",
    full_reveal: "solemnly",
  },
  7: {
    full_resistance: "distantly",
    defensive_deflection: "quietly",
    crack_in_armor: "softly",
    partial_concession: "calmly",
    full_reveal: "quietly",
  },
};

const CHARACTER_ALLOWED_DIRECTIONS: Record<number, ReadonlySet<VoiceDirection>> = {
  1: new Set(["softly", "quietly", "hesitantly", "warmly", "cautiously", "sincerely"]),
  2: new Set(["amused", "mischievously", "cautiously", "warmly", "sincerely"]),
  3: new Set(["solemnly", "quietly", "firmly", "calmly", "sincerely"]),
  4: new Set(["angry but controlled", "firmly", "quietly", "calmly", "sincerely"]),
  5: new Set(["thoughtfully", "quietly", "cautiously", "calmly", "solemnly"]),
  6: new Set(["authoritatively", "firmly", "solemnly", "quietly", "calmly", "sincerely"]),
  7: new Set(["distantly", "quietly", "softly", "calmly", "solemnly"]),
};

function performanceFitsCharacter(levelId: number, performance: VoicePerformance | undefined) {
  if (!performance) return undefined;
  return CHARACTER_ALLOWED_DIRECTIONS[levelId]?.has(performance.direction)
    ? performance
    : undefined;
}

function ruleDirection(
  levelId: number,
  emotions: EmotionState,
  responseMode?: ResponseMode,
): VoiceDirection {
  if (responseMode) {
    return CHARACTER_MODE_DIRECTIONS[levelId]?.[responseMode]
      ?? CHARACTER_MODE_DIRECTIONS[1]![responseMode];
  }

  if (hasLow(emotions, ["patience"]) || hasHigh(emotions, ["irritation"], 62)) return "firmly";
  if (hasHigh(emotions, ["suspicion", "caution", "distance"], 65)) return "cautiously";
  if (hasHigh(emotions, ["trust", "interest", "respect", "curiosity", "attention"], 70)) return "warmly";
  if (levelId === 2 && hasHigh(emotions, ["bargain"], 65)) return "mischievously";

  return getBaseVoiceDirection(levelId);
}

function rulePause(
  responseMode: ResponseMode | undefined,
  sentenceIndex: number,
  sentenceCount: number,
): "short" | "long" | null {
  if (sentenceIndex >= sentenceCount - 1) return null;
  if (responseMode === "crack_in_armor" && sentenceIndex === 0 && sentenceCount >= 3) return "short";
  if (responseMode === "full_reveal" && sentenceIndex === sentenceCount - 2 && sentenceCount >= 3) return "short";
  return null;
}

function alreadyHasNaturalPause(text: string): boolean {
  return /(?:\.{3}|…|—|--)\s*["”’»)]*[.!?]?\s*$/u.test(text.trim());
}

export function buildSpeechChunk(input: BuildSpeechChunkInput): SpeechChunk {
  const validatedPerformance = performanceFitsCharacter(
    input.levelId,
    voicePerformanceForResponse(
      parseVoicePerformance(input.voicePerformance, input.voicePerformance?.source),
      input.responseMode,
    ),
  );
  const direction = validatedPerformance?.direction
    ?? ruleDirection(input.levelId, input.emotions, input.responseMode);
  const directionSource = validatedPerformance?.source ?? "rules";
  const authoredPause =
    input.sentenceIndex < input.sentenceCount - 1
    && validatedPerformance?.pauseAfterSentence.includes(input.sentenceIndex)
    && !alreadyHasNaturalPause(input.displayText)
    ? validatedPerformance.subtlety === "pronounced" ? "long" : "short"
    : null;
  const pause = authoredPause
    ?? (alreadyHasNaturalPause(input.displayText)
      ? null
      : rulePause(input.responseMode, input.sentenceIndex, input.sentenceCount));

  const tags = [`[${direction}]`];
  const trailingPause = pause ? ` [${pause} pause]` : "";

  return {
    displayText: input.displayText,
    spokenText: `${tags.join(" ")} ${input.displayText}${trailingPause}`,
    directionSource,
  };
}

export function buildSpeechPlan(
  input: Omit<BuildSpeechChunkInput, "displayText" | "sentenceIndex" | "sentenceCount"> & {
    displayText: string;
  },
): SpeechPlan {
  const sentences = splitSpeechSentences(input.displayText);
  const canonicalSentences = sentences.length > 0 ? sentences : [input.displayText.trim()];
  const chunks = canonicalSentences.map((displayText, sentenceIndex) =>
    buildSpeechChunk({
      ...input,
      displayText,
      sentenceIndex,
      sentenceCount: canonicalSentences.length,
    }));
  const spokenText = chunks
    .map((chunk, index) =>
      index === 0
        ? chunk.spokenText
        : chunk.spokenText.replace(/^\[[^\]\r\n]{1,80}\]\s*/u, ""))
    .join(" ");

  return {
    displayText: canonicalSentences.join(" "),
    spokenText,
    sentences: canonicalSentences,
    directionSource: chunks[0]?.directionSource ?? "rules",
  };
}

export function alignSpeechCues(
  sentences: string[],
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  },
): SpeechCue[] {
  const alignedText = alignment.characters.join("");
  let searchFrom = 0;

  return sentences.map((displayText) => {
    const start = alignedText.indexOf(displayText, searchFrom);
    if (start < 0) throw new Error(`Could not align speech sentence: ${displayText}`);
    const end = start + displayText.length - 1;
    searchFrom = end + 1;

    return {
      displayText,
      startMs: Math.max(0, Math.round((alignment.character_start_times_seconds[start] ?? 0) * 1000)),
      endMs: Math.max(0, Math.round((
        alignment.character_end_times_seconds[end]
        ?? alignment.character_start_times_seconds[end]
        ?? 0
      ) * 1000)),
    };
  });
}

export function stripAudioTags(text: string): string {
  return text.replace(/\s*\[[^\]\r\n]{1,80}\]\s*/gu, " ").replace(/\s+/gu, " ").trim();
}

function spokenWords(text: string): string[] {
  return stripAudioTags(text)
    .toLocaleLowerCase("pl-PL")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function preservesDisplayWords(displayText: string, spokenText: string): boolean {
  const displayWords = spokenWords(displayText);
  const directedWords = spokenWords(spokenText);
  return displayWords.length === directedWords.length
    && displayWords.every((word, index) => word === directedWords[index]);
}
