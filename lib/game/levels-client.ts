import { getLevelStatus, type PlayerProgress } from "@/lib/game/progress";
import { levelDefinitions } from "@/lib/game/mock-levels";
import type { Level, LevelKind } from "@/lib/game/types";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

type GameLevelRow = Database["public"]["Tables"]["game_levels"]["Row"];

const OBJECTIVE_TYPE_MAP: Record<string, LevelKind> = {
  TARGET_UTTERANCE: "say_word",
  SECRET_REVEAL: "reveal_secret",
  AGREEMENT: "change_mind",
  CONCESSION: "confess",
  EMOTIONAL_UNLOCK: "emotional_unlock",
};

const DIFFICULTY_MAP: Record<string, Level["difficulty"]> = {
  łatwa: "easy",
  easy: "easy",
  średnia: "medium",
  medium: "medium",
  trudna: "hard",
  hard: "hard",
  finałowa: "final",
  final: "final",
};

function localizedFieldsFromRow(row: GameLevelRow, locale: Locale) {
  return (row.i18n as Record<string, Record<string, string>> | null | undefined)?.[locale];
}

function objectiveFromRow(row: GameLevelRow, locale: Locale) {
  const loc = localizedFieldsFromRow(row, locale);
  const config = (row.objective_config ?? {}) as Record<string, unknown>;
  const visual = levelDefinitions.find((entry) => entry.id === row.id);
  const objectives = getDictionary(locale).content.objectives;
  const hint =
    loc?.objective_hint ??
    (typeof config.hint === "string"
      ? config.hint
      : visual?.objective.hint ?? objectives.hintFallback);

  const title = loc?.title ?? row.title;

  let goal: string;
  if (typeof loc?.objective_goal === "string" && loc.objective_goal.trim()) {
    goal = loc.objective_goal.trim();
  } else if (typeof config.playerGoal === "string" && config.playerGoal.trim()) {
    goal = config.playerGoal.trim();
  } else if (row.objective_type === "TARGET_UTTERANCE" && typeof config.targetPhrase === "string") {
    goal = objectives.sayWordGoal(config.targetPhrase);
  } else {
    goal = visual?.objective.goal ?? title;
  }

  return {
    type: OBJECTIVE_TYPE_MAP[row.objective_type] ?? visual?.objective.type ?? "change_mind",
    goal,
    hint,
  };
}

function characterFromRow(row: GameLevelRow, locale: Locale): Level["character"] {
  const loc = localizedFieldsFromRow(row, locale);
  const visual = levelDefinitions.find((entry) => entry.id === row.id);
  const name = loc?.character_name ?? row.character_name;
  const archetype = loc?.archetype ?? row.archetype;
  const personality = loc?.publicDescription ?? row.short_description;

  return {
    ...(visual?.character ?? levelDefinitions[0]!.character),
    id: row.slug,
    name,
    title: archetype,
    personality,
    archetype,
  };
}

export function levelsFromApiRows(
  rows: GameLevelRow[],
  progress: PlayerProgress,
  locale: Locale,
): Level[] {
  return rows
    .filter((row) => row.is_active)
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      status: getLevelStatus(row.id, progress),
      difficulty: DIFFICULTY_MAP[row.difficulty_label.toLowerCase()] ?? "medium",
      character: characterFromRow(row, locale),
      objective: objectiveFromRow(row, locale),
    }));
}
