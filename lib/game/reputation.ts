import { applyEmotionDelta, asEmotionState, clamp } from "@/lib/game/emotions";
import {
  NEGATIVE_REPUTATION_INCIDENT_TAGS,
  POSITIVE_REPUTATION_PRAISE_TAGS,
  REPUTATION_TAG_DELTAS,
} from "@/lib/game/reputation-triggers";
import type { EmotionState } from "@/lib/game/types";
import type { Json } from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export interface ReputationTraits {
  respect: number;
  warmth: number;
  pressure: number;
  cunning: number;
  arrogance: number;
}

export interface ReputationIncident {
  levelId: number;
  tag: string;
  characterName: string;
  at: string;
}

export interface ReputationPraise {
  levelId: number;
  tag: string;
  characterName: string;
  at: string;
}

export interface PlayerReputation {
  renown: number;
  traits: ReputationTraits;
  lastIncident: ReputationIncident | null;
  lastPraise: ReputationPraise | null;
}

export interface ReputationSession {
  respect: number;
  warmth: number;
  pressure: number;
  cunning: number;
  arrogance: number;
  tags: string[];
  completionFallbackUsed?: boolean;
  flatteryStreak?: number;
}

export interface ReputationContext {
  rumorLine: string | null;
  emotionAdjustments: EmotionState;
  /** False when the level was already completed before this attempt started. */
  renownEligible?: boolean;
}

export type AttemptOutcome = "COMPLETED" | "EMOTION_BREAK" | "USER_EXITED" | null;

const TRAIT_KEYS = ["respect", "warmth", "pressure", "cunning", "arrogance"] as const;

function clampTrait(value: number) {
  return clamp(Math.round(value), 0, 100);
}

export function defaultReputation(): PlayerReputation {
  return {
    renown: 50,
    traits: {
      respect: 50,
      warmth: 50,
      pressure: 0,
      cunning: 50,
      arrogance: 0,
    },
    lastIncident: null,
    lastPraise: null,
  };
}

export function defaultReputationSession(): ReputationSession {
  return {
    respect: 0,
    warmth: 0,
    pressure: 0,
    cunning: 0,
    arrogance: 0,
    tags: [],
    completionFallbackUsed: false,
    flatteryStreak: 0,
  };
}

export function isSameCharacterEvent(
  event: { levelId: number } | null | undefined,
  currentLevelId: number,
): boolean {
  return event?.levelId === currentLevelId;
}

function parseTraits(raw: unknown): ReputationTraits {
  const defaults = defaultReputation().traits;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  return {
    respect: clampTrait(typeof record.respect === "number" ? record.respect : defaults.respect),
    warmth: clampTrait(typeof record.warmth === "number" ? record.warmth : defaults.warmth),
    pressure: clampTrait(typeof record.pressure === "number" ? record.pressure : defaults.pressure),
    cunning: clampTrait(typeof record.cunning === "number" ? record.cunning : defaults.cunning),
    arrogance: clampTrait(typeof record.arrogance === "number" ? record.arrogance : defaults.arrogance),
  };
}

function parseIncident(raw: unknown): ReputationIncident | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.levelId !== "number" || typeof record.tag !== "string" || typeof record.at !== "string") {
    return null;
  }
  return {
    levelId: record.levelId,
    tag: record.tag,
    characterName: typeof record.characterName === "string" ? record.characterName : "Postać",
    at: record.at,
  };
}

function parsePraise(raw: unknown): ReputationPraise | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.levelId !== "number" || typeof record.tag !== "string" || typeof record.at !== "string") {
    return null;
  }
  return {
    levelId: record.levelId,
    tag: record.tag,
    characterName: typeof record.characterName === "string" ? record.characterName : "Postać",
    at: record.at,
  };
}

export function parseReputation(raw: Json | null | undefined): PlayerReputation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultReputation();
  const record = raw as Record<string, unknown>;
  const traits = parseTraits(record.traits);
  const renown =
    typeof record.renown === "number" ? clampTrait(record.renown) : computeRenown(traits);
  return {
    renown,
    traits,
    lastIncident: parseIncident(record.lastIncident),
    lastPraise: parsePraise(record.lastPraise),
  };
}

export function parseReputationSession(raw: Json | null | undefined): ReputationSession {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultReputationSession();
  const record = raw as Record<string, unknown>;
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  return {
    respect: typeof record.respect === "number" ? record.respect : 0,
    warmth: typeof record.warmth === "number" ? record.warmth : 0,
    pressure: typeof record.pressure === "number" ? record.pressure : 0,
    cunning: typeof record.cunning === "number" ? record.cunning : 0,
    arrogance: typeof record.arrogance === "number" ? record.arrogance : 0,
    tags,
    completionFallbackUsed: record.completionFallbackUsed === true,
    flatteryStreak: typeof record.flatteryStreak === "number" ? record.flatteryStreak : 0,
  };
}

export function parseReputationContext(raw: Json | null | undefined): ReputationContext | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const rumorLine = typeof record.rumorLine === "string" ? record.rumorLine : null;
  const renownEligible = typeof record.renownEligible === "boolean" ? record.renownEligible : true;
  const emotionAdjustments =
    record.emotionAdjustments && typeof record.emotionAdjustments === "object" && !Array.isArray(record.emotionAdjustments)
      ? asEmotionState(record.emotionAdjustments as Json)
      : {};
  return { rumorLine, emotionAdjustments, renownEligible };
}

export function computeRenown(traits: ReputationTraits) {
  const positive = (traits.respect + traits.warmth + traits.cunning) / 3;
  const negative = (traits.pressure + traits.arrogance) / 2;
  return clampTrait(positive - negative * 0.45 + 12);
}

function applyTraitDelta(traits: ReputationTraits, delta: Partial<ReputationTraits>) {
  for (const key of TRAIT_KEYS) {
    traits[key] = clampTrait(traits[key] + (delta[key] ?? 0));
  }
}

function tagTraitDelta(tag: string): Partial<ReputationTraits> {
  return REPUTATION_TAG_DELTAS[tag] ?? {};
}

export function accumulateSession(session: ReputationSession, reactionTags: string[]): ReputationSession {
  const next: ReputationSession = {
    ...session,
    tags: [...session.tags],
  };

  for (const tag of reactionTags) {
    if (next.tags.includes(tag)) continue;
    next.tags.push(tag);
    const delta = tagTraitDelta(tag);
    next.respect += delta.respect ?? 0;
    next.warmth += delta.warmth ?? 0;
    next.pressure += delta.pressure ?? 0;
    next.cunning += delta.cunning ?? 0;
    next.arrogance += delta.arrogance ?? 0;
  }

  return next;
}

/** On replay wins, only negative tags still affect global traits. */
export function filterSessionForReplay(session: ReputationSession): ReputationSession {
  const filtered = defaultReputationSession();
  for (const tag of session.tags) {
    if (!NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag)) continue;
    const delta = tagTraitDelta(tag);
    filtered.respect += delta.respect ?? 0;
    filtered.warmth += delta.warmth ?? 0;
    filtered.pressure += delta.pressure ?? 0;
    filtered.cunning += delta.cunning ?? 0;
    filtered.arrogance += delta.arrogance ?? 0;
    filtered.tags.push(tag);
  }
  return filtered;
}

export type MergeReputationContext = {
  levelId: number;
  characterName: string;
  at: string;
  /** False when the player already completed this level before this attempt. */
  firstCompletion?: boolean;
};

export function mergeSessionIntoReputation(
  reputation: PlayerReputation,
  session: ReputationSession,
  outcome: AttemptOutcome,
  context?: MergeReputationContext,
): PlayerReputation {
  const firstCompletion = context?.firstCompletion ?? true;
  const sessionToApply =
    !firstCompletion && (outcome === "COMPLETED" || outcome === "USER_EXITED")
      ? filterSessionForReplay(session)
      : session;
  const traits = { ...reputation.traits };

  applyTraitDelta(traits, {
    respect: sessionToApply.respect,
    warmth: sessionToApply.warmth,
    pressure: sessionToApply.pressure,
    cunning: sessionToApply.cunning,
    arrogance: sessionToApply.arrogance,
  });

  if (outcome === "COMPLETED" && firstCompletion) {
    applyTraitDelta(traits, { respect: 1 });
  } else if (outcome === "EMOTION_BREAK") {
    applyTraitDelta(traits, { respect: -1, warmth: -1 });
  } else if (outcome === "USER_EXITED") {
    applyTraitDelta(traits, { respect: -1 });
  }

  let lastIncident = reputation.lastIncident;
  let lastPraise = reputation.lastPraise;
  const incidentTag = [...sessionToApply.tags].reverse().find((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag));
  if (incidentTag && context) {
    lastIncident = {
      levelId: context.levelId,
      tag: incidentTag,
      characterName: context.characterName,
      at: context.at,
    };
  }

  if (outcome === "COMPLETED" && context && firstCompletion) {
    const praiseTag = [...session.tags].reverse().find((tag) => POSITIVE_REPUTATION_PRAISE_TAGS.has(tag));
    if (praiseTag) {
      lastPraise = {
        levelId: context.levelId,
        tag: praiseTag,
        characterName: context.characterName,
        at: context.at,
      };
    }
  }

  const renownBase = computeRenown(traits);
  let renown = renownBase;
  if (outcome === "COMPLETED" && firstCompletion) renown = clampTrait(renownBase + 2);
  else if (outcome === "EMOTION_BREAK") renown = clampTrait(renownBase - 3);
  else if (outcome === "USER_EXITED") renown = clampTrait(renownBase - 1);

  return { renown, traits, lastIncident, lastPraise };
}

export function computeEmotionAdjustments(levelId: number, reputation: PlayerReputation): EmotionState {
  const { traits } = reputation;
  const adjustments: EmotionState = {};

  if (levelId === 1) {
    if (traits.pressure >= 50) {
      adjustments.suspicion = 10;
      adjustments.trust = -6;
    }
    if (traits.warmth >= 60) {
      adjustments.trust = (adjustments.trust ?? 0) + 6;
      adjustments.patience = 4;
    }
  }

  if (levelId === 2) {
    if (traits.pressure >= 55) {
      adjustments.caution = 8;
      adjustments.interest = -5;
    }
    if (traits.warmth >= 60) {
      adjustments.interest = (adjustments.interest ?? 0) + 4;
    }
  }

  if (levelId === 3) {
    if (traits.respect <= 40) {
      adjustments.respect = -6;
      adjustments.pride = 4;
    }
    if (traits.warmth >= 60) {
      adjustments.patience = 4;
    }
  }

  if (levelId === 4) {
    if (traits.warmth >= 60) {
      adjustments.stubbornness = 5;
      adjustments.irritation = 3;
    }
    if (traits.respect >= 60) {
      adjustments.respect = 5;
    }
  }

  if (levelId === 5) {
    if (traits.arrogance >= 50) {
      adjustments.curiosity = -6;
      adjustments.patience = -4;
    }
    if (traits.warmth >= 60) {
      adjustments.curiosity = (adjustments.curiosity ?? 0) + 4;
    }
  }

  if (levelId === 6) {
    if (traits.pressure >= 50 || traits.arrogance >= 50) {
      adjustments.ego = -8;
      adjustments.patience = -5;
    }
    if (traits.respect >= 60) {
      adjustments.respect = 5;
    }
  }

  if (levelId === 7) {
    if (traits.arrogance >= 50) {
      adjustments.distance = 8;
      adjustments.attention = -6;
    }
    if (traits.warmth >= 65) {
      adjustments.attention = (adjustments.attention ?? 0) + 4;
      adjustments.distance = (adjustments.distance ?? 0) - 4;
    }
  }

  return adjustments;
}

export function applyReputationToStartingEmotions(
  levelId: number,
  baseEmotions: EmotionState,
  reputation: PlayerReputation,
): { emotions: EmotionState; adjustments: EmotionState } {
  const adjustments = computeEmotionAdjustments(levelId, reputation);
  const emotions = applyEmotionDelta(baseEmotions, adjustments);
  return { emotions, adjustments };
}

/**
 * Incident tags that qualify for a rumor line. Display text for each tag
 * lives in the locale catalogs (`content.reputation.incidentRumors`,
 * `lib/i18n/messages/{pl,en}.ts`) — this set only tracks which tags qualify.
 */
const INCIDENT_RUMOR_TAGS = new Set([
  "honor_wound",
  "ego_insult",
  "forced_demand",
  "verbal_abuse",
  "desperate_bargain",
  "coward_accusation",
  "rushed_arrogance",
  "dominance_play",
]);

export function buildRumorLine(
  reputation: PlayerReputation,
  orderIndex: number,
  currentLevelId?: number,
  locale: Locale = "pl",
): string | null {
  if (orderIndex < 3) return null;

  const rumors = getDictionary(locale).content.reputation;

  const incident = reputation.lastIncident;
  if (
    incident &&
    INCIDENT_RUMOR_TAGS.has(incident.tag) &&
    !isSameCharacterEvent(incident, currentLevelId ?? -1)
  ) {
    return rumors.incidentRumors[incident.tag as keyof typeof rumors.incidentRumors];
  }

  const praise = reputation.lastPraise;
  if (
    praise &&
    POSITIVE_REPUTATION_PRAISE_TAGS.has(praise.tag) &&
    !isSameCharacterEvent(praise, currentLevelId ?? -1)
  ) {
    return rumors.praiseRumors[praise.tag as keyof typeof rumors.praiseRumors];
  }

  const { traits } = reputation;
  if (traits.pressure >= 65) {
    return rumors.genericRumors.highPressure;
  }
  if (traits.warmth >= 65) {
    return rumors.genericRumors.highWarmth;
  }
  if (traits.arrogance >= 60) {
    return rumors.genericRumors.highArrogance;
  }
  if (traits.respect <= 35) {
    return rumors.genericRumors.lowRespect;
  }
  if (traits.cunning <= 35) {
    return rumors.genericRumors.lowCunning;
  }

  return null;
}

/**
 * Rumor lines built for `pl` are prefixed with "Plotka:"; this strips it for
 * UI contexts that already supply their own framing. English rumor text has
 * no such prefix, so the regex is simply a no-op there.
 */
export function formatRumorForDisplay(rumorLine: string): string {
  return rumorLine.replace(/^Plotka:\s*/i, "").trim();
}

export type RenownFootnote =
  | { kind: "incident"; characterName: string; label: string }
  | { kind: "praise"; characterName: string; label: string };

export function getRenownFootnote(reputation: PlayerReputation, locale: Locale = "pl"): RenownFootnote | null {
  const incident = reputation.lastIncident;
  const praise = reputation.lastPraise;
  const labels = getDictionary(locale).content.reputation;
  const incidentLabels: Record<string, string> = labels.incidentLabels;
  const praiseLabels: Record<string, string> = labels.praiseLabels;

  if (incident && praise) {
    const preferPraise = praise.at > incident.at;
    const chosen = preferPraise ? praise : incident;
    return {
      kind: preferPraise ? "praise" : "incident",
      characterName: chosen.characterName,
      label: preferPraise ? praiseLabels[chosen.tag] ?? chosen.tag : incidentLabels[chosen.tag] ?? chosen.tag,
    };
  }

  if (incident) {
    return {
      kind: "incident",
      characterName: incident.characterName,
      label: incidentLabels[incident.tag] ?? incident.tag,
    };
  }

  if (praise) {
    return {
      kind: "praise",
      characterName: praise.characterName,
      label: praiseLabels[praise.tag] ?? praise.tag,
    };
  }

  return null;
}

/** Short explanation of renown for the player (HUD / tooltip). */
export function getReputationPlayerHelp(locale: Locale = "pl") {
  return getDictionary(locale).content.reputation.playerHelp;
}

export function buildReputationContext(
  levelId: number,
  orderIndex: number,
  baseEmotions: EmotionState,
  reputation: PlayerReputation,
  renownEligible = true,
  locale: Locale = "pl",
): ReputationContext {
  const { emotions, adjustments } = applyReputationToStartingEmotions(levelId, baseEmotions, reputation);
  void emotions;
  return {
    rumorLine: buildRumorLine(reputation, orderIndex, levelId, locale),
    emotionAdjustments: adjustments,
    renownEligible,
  };
}

export function reputationToJson(reputation: PlayerReputation): Json {
  return reputation as unknown as Json;
}

export function reputationSessionToJson(session: ReputationSession): Json {
  return session as unknown as Json;
}

export function reputationContextToJson(context: ReputationContext): Json {
  return context as unknown as Json;
}
