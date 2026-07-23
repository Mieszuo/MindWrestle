import type { EmotionBarDanger } from "@/lib/game/defeat-thresholds";
import { getEmotionBarDanger } from "@/lib/game/defeat-thresholds";
import type { EmotionMoodTone } from "@/lib/game/level-emotions";
import type { ResponseMode } from "@/lib/game/psychology/types";
import { NEGATIVE_REPUTATION_INCIDENT_TAGS } from "@/lib/game/reputation-triggers";
import { getLevelRedLines } from "@/lib/game/resistance-triggers";
import type { AttemptSnapshot, Character, LevelObjective } from "@/lib/game/types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export type CoachingKind =
  | "warning"
  | "breakthrough"
  | "lore_echo"
  | "requested";

export interface CoachingHint {
  id: string;
  kind: CoachingKind;
  title: string;
  observation: string;
  interpretation: string;
  direction: string;
  body: string;
  sourceTurn: number;
  relatedTags: string[];
  persistent: boolean;
  priority: number;
}

export interface ConversationStatSnapshot {
  key: string;
  label: string;
  value: number;
  tone: EmotionMoodTone;
}

export interface CoachingHintContext {
  levelId: number;
  character: Character;
  objective: LevelObjective;
  attempt: AttemptSnapshot | null;
  previousAttempt: AttemptSnapshot | null;
  reactionTags: string[];
  stats: ConversationStatSnapshot[];
  /** IDs of hints already shown — used to skip duplicates */
  shownHintIds: Set<string>;
  /**
   * Previous emotion danger levels keyed by stat key.
   * Used to detect when an emotion *enters* a danger zone (transition event)
   * rather than re-triggering every turn it stays there.
   */
  previousEmotionDangers: Map<string, EmotionBarDanger>;
  goalProgressHistory: number[];
  responseMode?: ResponseMode;
  previousResponseMode?: ResponseMode;
  attemptJustStarted?: boolean;
  locale: Locale;
}

const RESPONSE_MODE_RANK: Record<ResponseMode, number> = {
  full_resistance: 0,
  defensive_deflection: 1,
  crack_in_armor: 2,
  partial_concession: 3,
  full_reveal: 4,
};

function createHint(
  data: Omit<CoachingHint, "body" | "persistent"> & { persistent?: boolean },
): CoachingHint {
  return {
    ...data,
    persistent: data.persistent ?? true,
    body: [data.observation, data.interpretation, data.direction].filter(Boolean).join(" "),
  };
}

function redLineHint(
  levelId: number,
  tag: string,
  turn: number,
  content: ReturnType<typeof getDictionary>["content"]["coaching"],
  resistance: ReturnType<typeof getDictionary>["content"]["resistanceTriggers"],
): CoachingHint | null {
  const line = getLevelRedLines(levelId).find((entry) => entry.tag === tag);
  if (!line) return null;

  const copy = resistance[tag];
  return createHint({
    // Stable ID — one red-line warning per tag per attempt
    id: `warning-redline-${tag}`,
    kind: "warning",
    title: copy?.label ?? line.label,
    observation: copy?.playerHint ?? line.playerHint,
    interpretation: content.redLine.interpretation,
    direction: content.redLine.direction,
    sourceTurn: turn,
    relatedTags: [tag],
    priority: 100,
  });
}

function genericWarning(
  tag: string,
  turn: number,
  content: ReturnType<typeof getDictionary>["content"]["coaching"],
): CoachingHint | null {
  if (tag === "direct_pressure") {
    const copy = content.genericWarnings.directPressure;
    return createHint({
      // Stable ID — shown once per attempt
      id: `warning-direct-pressure`,
      kind: "warning",
      title: copy.title,
      observation: copy.observation,
      interpretation: copy.interpretation,
      direction: copy.direction,
      sourceTurn: turn,
      relatedTags: [tag],
      priority: 98,
    });
  }
  if (tag === "hollow_flattery") {
    const copy = content.genericWarnings.hollowFlattery;
    return createHint({
      id: `warning-hollow-flattery`,
      kind: "warning",
      title: copy.title,
      observation: copy.observation,
      interpretation: copy.interpretation,
      direction: copy.direction,
      sourceTurn: turn,
      relatedTags: [tag],
      priority: 96,
    });
  }
  return null;
}

function loreEchoHint(
  levelId: number,
  turn: number,
  content: ReturnType<typeof getDictionary>["content"]["coaching"],
): CoachingHint {
  const direction =
    levelId === 2 ? content.loreEcho.directionLevel2 : content.loreEcho.directionDefault;

  return createHint({
    id: `lore-echo-l${levelId}`,
    kind: "lore_echo",
    title: content.loreEcho.title,
    observation: content.loreEcho.observation,
    interpretation: content.loreEcho.interpretation,
    direction,
    sourceTurn: turn,
    relatedTags: ["uses_previous_lore"],
    priority: 86,
  });
}

function breakthroughHint(
  levelId: number,
  responseMode: ResponseMode | undefined,
  previousResponseMode: ResponseMode | undefined,
  turn: number,
  content: ReturnType<typeof getDictionary>["content"]["coaching"],
): CoachingHint | null {
  if (!responseMode || !previousResponseMode) return null;
  if (RESPONSE_MODE_RANK[responseMode] <= RESPONSE_MODE_RANK[previousResponseMode]) return null;
  if (RESPONSE_MODE_RANK[responseMode] < RESPONSE_MODE_RANK.crack_in_armor) return null;

  const levelKey = String(levelId) as keyof typeof content.breakthrough.copyByLevel;
  const copy = content.breakthrough.copyByLevel[levelKey];
  if (!copy) return null;

  return createHint({
    // Stable ID — one breakthrough per response-mode milestone per attempt
    id: `breakthrough-${responseMode}-l${levelId}`,
    kind: "breakthrough",
    title:
      responseMode === "partial_concession"
        ? content.breakthrough.titlePartialConcession
        : content.breakthrough.titleDefault,
    ...copy,
    sourceTurn: turn,
    relatedTags: [],
    priority: 92,
  });
}

/**
 * Emits a warning when an emotion TRANSITIONS INTO a danger zone
 * (comfortable → warning, or warning → critical).
 * Uses a stable ID based on key+danger so the same transition won't re-fire.
 * When the emotion recovers below danger, its shown-ID should be removed
 * by the caller to allow re-triggering if it deteriorates again.
 */
function emotionEntryWarning(
  levelId: number,
  stats: ConversationStatSnapshot[],
  previousEmotionDangers: Map<string, EmotionBarDanger>,
  shownHintIds: Set<string>,
  turn: number,
  content: ReturnType<typeof getDictionary>["content"]["coaching"],
): CoachingHint | null {
  const candidates: CoachingHint[] = [];
  const emotionDirections = content.emotionDirections as Partial<Record<EmotionMoodTone, string>>;

  for (const stat of stats) {
    const danger = getEmotionBarDanger(levelId, stat.key, stat.value);
    const prev = previousEmotionDangers.get(stat.key) ?? "comfortable";

    if (danger === "comfortable") continue;

    // Only trigger when entering or worsening danger — not staying in the same level
    const isWorsening =
      (prev === "comfortable" && (danger === "uneasy" || danger === "critical")) ||
      (prev === "uneasy" && danger === "critical");

    const stableId = `emotion-${stat.key}-${danger}`;
    if (!isWorsening && shownHintIds.has(stableId)) continue;
    if (!isWorsening) continue;

    const hint = createHint({
      id: stableId,
      kind: "warning",
      title: danger === "critical" ? content.emotionEntry.criticalTitle : content.emotionEntry.uneasyTitle,
      observation:
        danger === "critical"
          ? content.emotionEntry.observationCritical(stat.label)
          : content.emotionEntry.observationUneasy(stat.label),
      interpretation:
        danger === "critical"
          ? content.emotionEntry.interpretationCritical
          : content.emotionEntry.interpretationUneasy,
      direction: emotionDirections[stat.tone] ?? content.fallbackDirection,
      sourceTurn: turn,
      relatedTags: [],
      priority: danger === "critical" ? 95 : 70,
    });
    candidates.push(hint);
  }

  // Return only the most severe one
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0] ?? null;
}

export function evaluateCoachingHints(context: CoachingHintContext): CoachingHint | null {
  const {
    attempt,
    reactionTags,
    shownHintIds,
    previousEmotionDangers,
    levelId,
    stats,
    locale,
  } = context;
  if (!attempt || attempt.status !== "IN_PROGRESS") return null;

  const dict = getDictionary(locale).content;
  const content = dict.coaching;
  const turn = attempt.turnsCount;
  const candidates: CoachingHint[] = [];

  // ── 1. Red-line / strong negative tag warnings (highest priority) ──
  for (const tag of reactionTags) {
    const generic = genericWarning(tag, turn, content);
    if (generic && !shownHintIds.has(generic.id)) candidates.push(generic);

    if (NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag)) {
      const warning = redLineHint(levelId, tag, turn, content, dict.resistanceTriggers);
      if (warning && !shownHintIds.has(warning.id)) candidates.push(warning);
    }
  }

  // ── 2. Breakthrough (emotion opened up) ──
  const breakthrough = breakthroughHint(
    levelId,
    context.responseMode,
    context.previousResponseMode,
    turn,
    content,
  );
  if (breakthrough && !shownHintIds.has(breakthrough.id)) candidates.push(breakthrough);

  // ── 3. Lore echo ──
  if (reactionTags.includes("uses_previous_lore")) {
    const lore = loreEchoHint(levelId, turn, content);
    if (!shownHintIds.has(lore.id)) candidates.push(lore);
  }

  // ── 4. Emotion entering danger zone (transition-only, not per-turn) ──
  const emotionEntry = emotionEntryWarning(
    levelId,
    stats,
    previousEmotionDangers,
    shownHintIds,
    turn,
    content,
  );
  if (emotionEntry) candidates.push(emotionEntry);

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0] ?? null;
}

/**
 * Call this after each turn to update the previous emotion danger map.
 * Also removes stale shown-IDs when an emotion recovers from danger,
 * so it can re-trigger if conditions worsen again later.
 */
export function updateEmotionDangerTracking(
  levelId: number,
  stats: ConversationStatSnapshot[],
  previousEmotionDangers: Map<string, EmotionBarDanger>,
  shownHintIds: Set<string>,
): void {
  for (const stat of stats) {
    const danger = getEmotionBarDanger(levelId, stat.key, stat.value);
    const prev = previousEmotionDangers.get(stat.key) ?? "comfortable";

    // When emotion recovers to comfortable, clear shown IDs for that emotion
    // so the warning can fire again if it deteriorates later
    if (danger === "comfortable" && prev !== "comfortable") {
      shownHintIds.delete(`emotion-${stat.key}-uneasy`);
      shownHintIds.delete(`emotion-${stat.key}-critical`);
    }

    previousEmotionDangers.set(stat.key, danger);
  }
}
