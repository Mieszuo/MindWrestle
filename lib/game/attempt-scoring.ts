import { NEGATIVE_REPUTATION_INCIDENT_TAGS } from "@/lib/game/reputation-triggers";
import type { ReputationSession } from "@/lib/game/reputation";
import { getDictionary } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

export interface AttemptScore {
  style: string;
  clarity: number;
  rank: "Platinum" | "Gold" | "Silver";
}

export function scoreAttempt({
  durationMs,
  turnsCount,
  session,
  rankingPosition,
  locale = "en",
}: {
  durationMs: number;
  turnsCount: number;
  session: ReputationSession;
  rankingPosition: number | null;
  locale?: Locale;
}): AttemptScore {
  const content = getDictionary(locale).content;
  const negativeTags = session.tags.filter((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag));
  const positiveTags = session.tags.filter((tag) => !NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag));
  const clarity = Math.max(0, Math.min(100, Math.round(100 - (negativeTags.length / Math.max(turnsCount, 1)) * 100)));

  const styleTag = positiveTags.at(-1) ?? session.tags.at(-1) ?? "patient";
  const style = content.styleLabels[styleTag] ?? content.styleFallback;

  const fastRun = durationMs > 0 && durationMs <= 180_000 && turnsCount <= 5;
  const rank: AttemptScore["rank"] =
    (rankingPosition != null && rankingPosition <= 3) || (clarity >= 85 && fastRun)
      ? "Platinum"
      : clarity >= 55 || positiveTags.length > 0
        ? "Gold"
        : "Silver";

  return { style, clarity, rank };
}
