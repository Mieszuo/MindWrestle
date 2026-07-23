"use client";

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

import { PressableButton } from "@/components/ui/pressable-button";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { getDefeatCopy } from "@/lib/game/defeat-copy";
import type { DefeatReason } from "@/lib/game/defeat";
import { formatDuration } from "@/lib/game/progress";
import styles from "@/components/game/defeat-modal.module.css";

export interface DefeatSummary {
  durationMs: number;
  turnsCount: number;
  goalProgress?: number;
  renownDelta?: number;
  resistanceLabel?: string;
  cardHint?: string;
}

interface DefeatModalProps {
  open: boolean;
  levelId: number;
  characterName: string;
  defeatReason: DefeatReason;
  summary: DefeatSummary;
  busy?: boolean;
  onReturnToMap: () => void;
  onTryAgain: () => void;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DefeatModal({
  open,
  levelId,
  characterName,
  defeatReason,
  summary,
  busy = false,
  onReturnToMap,
  onTryAgain,
}: DefeatModalProps) {
  const t = useT();
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const copy = getDefeatCopy(levelId, defeatReason, locale);

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
        aria-labelledby="defeat-modal-title"
        {...modalMotion}
      >
        <div className={styles.shadowVeil} aria-hidden />

        <div className={styles.content}>
          <div className={`${styles.seal} ${styles[`seal--${copy.sealVariant}`] ?? ""}`} aria-hidden>
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
              <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className={styles.heading}>
            <p className={styles.eyebrow}>{t.outcome.defeat.eyebrow}</p>
            <h2 id="defeat-modal-title" className={styles.title}>
              {copy.title}
            </h2>
            <p className={styles.characterName}>{t.outcome.defeat.conversationEnded(characterName)}</p>
          </div>

          <blockquote className={styles.quote}>{t.outcome.shared.quoteWrap(copy.quote)}</blockquote>

          <p className={styles.hint}>{copy.hint}</p>

          {(summary.resistanceLabel || summary.cardHint) && (
            <div className={styles.coaching}>
              {summary.resistanceLabel && (
                <p>
                  <strong>{t.outcome.defeat.whatWentWrongLabel}</strong> {summary.resistanceLabel}
                </p>
              )}
              {summary.cardHint && (
                <p>
                  <strong>{t.outcome.defeat.hintLabel}</strong> {summary.cardHint}
                </p>
              )}
            </div>
          )}

          <div className={styles.statsSection}>
            <p className={styles.statsSectionLabel}>{t.outcome.shared.statsSectionLabel}</p>
            <div className={styles.statsGrid}>
              <StatCard label={t.outcome.shared.turnsLabel} value={summary.turnsCount} />
              <StatCard label={t.outcome.shared.timeLabel} value={formatDuration(summary.durationMs)} />
              {summary.goalProgress != null && (
                <StatCard label={t.outcome.defeat.goalProgressLabel} value={`${summary.goalProgress}%`} />
              )}
            </div>
          </div>

          {summary.renownDelta != null && summary.renownDelta !== 0 && (
            <p className={styles.hint}>{t.outcome.shared.renownDelta(summary.renownDelta)}</p>
          )}
          {summary.renownDelta != null && summary.renownDelta === 0 && (
            <p className={styles.hint}>{t.outcome.shared.renownUnchanged}</p>
          )}

          <div className={styles.actions}>
            <PressableButton tone="primary" onClick={onTryAgain} disabled={busy} sound="none">
              {busy ? t.outcome.shared.preparing : t.outcome.shared.tryAgain}
            </PressableButton>
            <PressableButton tone="secondary" onClick={onReturnToMap} disabled={busy}>
              {t.outcome.shared.returnToMap}
            </PressableButton>
          </div>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
