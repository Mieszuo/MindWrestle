import type { PsychJudgeOutput } from "@/lib/game/psychology/mock-psych-judge";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];

export function mockPsychCharacterMessage({
  level,
  responseMode,
  judge,
  objectivePressure,
  locale,
}: {
  level: GameLevelRow;
  responseMode: ResponseMode;
  judge: PsychJudgeOutput;
  objectivePressure: number;
  locale: Locale;
}) {
  const { mockPsych } = getDictionary(locale).content.fallbackDialogue;
  const levelKey = String(level.id) as keyof typeof mockPsych.resistance;

  if (judge.resistanceTriggered || responseMode === "full_resistance") {
    return mockPsych.resistance[levelKey] ?? mockPsych.genericResistance;
  }

  if (responseMode === "crack_in_armor" || responseMode === "partial_concession") {
    return (
      mockPsych.crack[levelKey as keyof typeof mockPsych.crack] ??
      mockPsych.warmNeutral[levelKey] ??
      mockPsych.genericWaiting
    );
  }

  if (objectivePressure > 50) {
    return mockPsych.warmNeutral[levelKey] ?? mockPsych.genericHesitant;
  }

  return mockPsych.warmNeutral[levelKey] ?? mockPsych.genericHesitant;
}
