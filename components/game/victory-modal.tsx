"use client";

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import type { AttemptScore } from "@/lib/game/attempt-scoring";
import { formatDuration } from "@/lib/game/progress";
import styles from "@/components/game/victory-modal.module.css";

export interface VictorySummary {
  durationMs: number;
  turnsCount: number;
  rankingPosition: number | null;
  isNewPersonalBest: boolean;
  renownDelta?: number;
  quote?: string;
  attemptScore?: AttemptScore;
  attemptId?: string;
  nextLevelId?: number | null;
}

interface VictoryModalProps {
  open: boolean;
  characterName: string;
  summary: VictorySummary;
  busy?: boolean;
  onReturnToMap: () => void;
  onTryAgain: () => void;
  onNextLevel?: (levelId: number) => void;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className={styles.statCard} title={hint}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function VictoryModal({
  open,
  characterName,
  summary,
  busy = false,
  onReturnToMap,
  onTryAgain,
  onNextLevel,
}: VictoryModalProps) {
  const t = useT();
  const reducedMotion = useReducedMotion();

  if (typeof document === "undefined" || !open) return null;

  const backdropMotion = reducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.45, ease: "easeOut" as const },
      };

  const modalMotion = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.93, y: 24 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { type: "spring" as const, duration: 0.68, bounce: 0.16, delay: 0.08 },
      };

  return createPortal(
    <motion.div className={styles.backdrop} role="presentation" {...backdropMotion}>
      <motion.section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-modal-title"
        {...modalMotion}
      >
        <div className={styles.glowBurst} aria-hidden />
        <div className={styles.sparkleField} aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>

        <div className={styles.content}>
          <div className={styles.seal} aria-hidden>
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
              <path
                d="M14 24.5l7 7 13-14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className={styles.heading}>
            <p className={styles.eyebrow}>{t.outcome.victory.eyebrow}</p>
            <h2 id="victory-modal-title" className={styles.title}>
              {t.outcome.victory.title}
            </h2>
            <p className={styles.characterName}>{t.outcome.victory.conversationSuccess(characterName)}</p>
          </div>

          {summary.quote && (
            <blockquote className={styles.quote}>{t.outcome.shared.quoteWrap(summary.quote)}</blockquote>
          )}

          <div className={styles.statsSection}>
            <p className={styles.statsSectionLabel}>{t.outcome.shared.statsSectionLabel}</p>
            <div className={styles.statsGrid}>
              <StatCard label={t.outcome.shared.turnsLabel} value={summary.turnsCount} />
              <StatCard label={t.outcome.shared.timeLabel} value={formatDuration(summary.durationMs)} />
              <StatCard
                label={t.outcome.victory.rankingPositionLabel}
                value={summary.rankingPosition != null ? `#${summary.rankingPosition}` : t.outcome.victory.rankingPositionEmpty}
              />
            </div>
          </div>

          {summary.attemptScore && (
            <div className={styles.statsSection}>
              <p className={styles.statsSectionLabel}>{t.outcome.victory.conversationScoreLabel}</p>
              <div className={styles.statsGrid}>
                <StatCard
                  label={t.outcome.victory.styleLabel}
                  value={summary.attemptScore.style}
                  hint={t.outcome.victory.styleHint}
                />
                <StatCard
                  label={t.outcome.victory.clarityLabel}
                  value={`${summary.attemptScore.clarity}%`}
                  hint={t.outcome.victory.clarityHint}
                />
                <StatCard
                  label={t.outcome.victory.rankLabel}
                  value={summary.attemptScore.rank}
                  hint={t.outcome.victory.rankHint}
                />
              </div>
            </div>
          )}

          {(summary.isNewPersonalBest || summary.renownDelta != null) && (
            <div className={styles.badges}>
              {summary.isNewPersonalBest && (
                <p className={styles.recordBadge}>{t.outcome.victory.newPersonalBest}</p>
              )}
              {summary.renownDelta != null && summary.renownDelta !== 0 && (
                <p className={styles.recordBadge}>{t.outcome.shared.renownDelta(summary.renownDelta)}</p>
              )}
              {summary.renownDelta != null && summary.renownDelta === 0 && (
                <p className={styles.recordBadge}>{t.outcome.shared.renownUnchanged}</p>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <PressableButton tone="primary" onClick={onTryAgain} disabled={busy} sound="none">
              {busy ? t.outcome.shared.preparing : t.outcome.shared.tryAgain}
            </PressableButton>
            <PressableButton tone="secondary" onClick={onReturnToMap} disabled={busy}>
              {t.outcome.shared.returnToMap}
            </PressableButton>
            {summary.nextLevelId && onNextLevel && (
              <PressableButton tone="primary" onClick={() => onNextLevel(summary.nextLevelId!)} disabled={busy}>
                {t.outcome.victory.nextLevel}
              </PressableButton>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
