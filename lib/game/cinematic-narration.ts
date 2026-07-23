import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export type NarratorDirection = "slowly" | "quietly" | "softly" | "solemnly";

export interface NarratorPerformance {
  direction: NarratorDirection;
  pauseAfterSentence: number[];
  pauseLength: "short" | "long";
}

export interface CinematicNarrationEntry {
  id: string;
  audio: string;
  title: string;
  narration: string;
  voicePerformance: NarratorPerformance;
}

type CinematicNarrationStructure = Omit<CinematicNarrationEntry, "title" | "narration">;

const INTRO_STRUCTURE: CinematicNarrationStructure[] = [
  {
    id: "intro-01",
    audio: "/audio/narrator/intro/01-seven-silences.mp3",
    voicePerformance: { direction: "slowly", pauseAfterSentence: [1], pauseLength: "short" },
  },
  {
    id: "intro-02",
    audio: "/audio/narrator/intro/02-nameless-wanderer.mp3",
    voicePerformance: { direction: "quietly", pauseAfterSentence: [], pauseLength: "short" },
  },
  {
    id: "intro-03",
    audio: "/audio/narrator/intro/03-every-silence-different.mp3",
    voicePerformance: { direction: "slowly", pauseAfterSentence: [2], pauseLength: "short" },
  },
  {
    id: "intro-04",
    audio: "/audio/narrator/intro/04-truth-from-their-lips.mp3",
    voicePerformance: { direction: "slowly", pauseAfterSentence: [], pauseLength: "short" },
  },
  {
    id: "intro-05",
    audio: "/audio/narrator/intro/05-chronicle-road.mp3",
    voicePerformance: { direction: "softly", pauseAfterSentence: [1], pauseLength: "short" },
  },
];

const ENDING_STRUCTURE: CinematicNarrationStructure[] = [
  {
    id: "ending-01",
    audio: "/audio/narrator/ending/01-seven-voices.mp3",
    voicePerformance: { direction: "solemnly", pauseAfterSentence: [1], pauseLength: "short" },
  },
  {
    id: "ending-02",
    audio: "/audio/narrator/ending/02-first-word.mp3",
    voicePerformance: { direction: "quietly", pauseAfterSentence: [1], pauseLength: "long" },
  },
  {
    id: "ending-03",
    audio: "/audio/narrator/ending/03-name.mp3",
    voicePerformance: { direction: "softly", pauseAfterSentence: [1], pauseLength: "short" },
  },
  {
    id: "ending-04",
    audio: "/audio/narrator/ending/04-breath.mp3",
    voicePerformance: { direction: "slowly", pauseAfterSentence: [], pauseLength: "short" },
  },
  {
    id: "ending-05",
    audio: "/audio/narrator/ending/05-road.mp3",
    voicePerformance: { direction: "quietly", pauseAfterSentence: [3], pauseLength: "short" },
  },
];

function buildNarration(
  structure: CinematicNarrationStructure[],
  dict: Record<string, { title: string; narration: string }>,
): CinematicNarrationEntry[] {
  return structure.map((entry) => {
    const copy = dict[entry.id];
    return {
      ...entry,
      title: copy.title,
      narration: copy.narration,
    };
  });
}

export function getIntroNarration(locale: Locale): CinematicNarrationEntry[] {
  return buildNarration(INTRO_STRUCTURE, getDictionary(locale).content.narration.intro);
}

export function getEndingNarration(locale: Locale): CinematicNarrationEntry[] {
  return buildNarration(ENDING_STRUCTURE, getDictionary(locale).content.narration.ending);
}
