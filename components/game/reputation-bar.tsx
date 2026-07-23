"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getRenownFootnote, getReputationPlayerHelp, type PlayerReputation } from "@/lib/game/reputation";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import mapStyles from "@/components/game/level-map/LevelMap.module.css";
import styles from "@/components/game/reputation-bar.module.css";

interface ReputationBarProps {
  reputation: PlayerReputation;
  variant?: "compact" | "title";
}

export function ReputationBar({ reputation, variant = "compact" }: ReputationBarProps) {
  const t = useT();
  const locale = useLocale();
  const traitLabel = (key: keyof PlayerReputation["traits"]) => t.level.reputation.traits[key];
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const footnote = getRenownFootnote(reputation, locale);
  const playerHelp = getReputationPlayerHelp(locale);

  useEffect(() => {
    if (!helpOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!helpRef.current?.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [helpOpen]);

  if (variant === "title") {
    return (
      <div className={mapStyles.hudRenownInner} ref={helpRef}>
        <button
          type="button"
          className={mapStyles.hudRenownHelp}
          aria-label={t.level.reputation.helpAriaLabel}
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((current) => !current)}
        >
          <CircleHelp aria-hidden />
        </button>

        {helpOpen && (
          <div className={mapStyles.hudRenownHelpPopover} role="dialog" aria-label={playerHelp.title}>
            <p className={mapStyles.hudRenownHelpTitle}>{playerHelp.title}</p>
            {playerHelp.paragraphs.map((paragraph) => (
              <p key={paragraph} className={mapStyles.hudRenownHelpText}>
                {paragraph}
              </p>
            ))}
          </div>
        )}

        <button
          type="button"
          className={mapStyles.hudRenownButton}
          aria-expanded={expanded}
          aria-label={t.level.reputation.renownAriaLabelDetailed(reputation.renown)}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{t.level.reputation.label}</span>
          <strong>{reputation.renown}</strong>
          <div className={mapStyles.hudRenownTrack} aria-hidden>
            <i style={{ width: `${reputation.renown}%` }} />
          </div>
        </button>

        {footnote && (
          <p
            className={`${mapStyles.hudRenownFootnote} ${
              footnote.kind === "incident" ? mapStyles.hudRenownFootnoteIncident : mapStyles.hudRenownFootnotePraise
            }`}
          >
            <span className={mapStyles.hudRenownFootnoteEyebrow}>
              {footnote.kind === "incident" ? t.level.reputation.lastIncident : t.level.reputation.lastPraise}
            </span>
            <span className={mapStyles.hudRenownFootnoteText}>
              {footnote.characterName} — {footnote.label}
            </span>
          </p>
        )}

        {expanded && (
          <div className={mapStyles.hudRenownDetails}>
            {(Object.keys(reputation.traits) as Array<keyof PlayerReputation["traits"]>).map((key) => (
              <div key={key} className={mapStyles.hudRenownTraitRow}>
                <span>{traitLabel(key)}</span>
                <div className={mapStyles.hudRenownTraitTrack} aria-hidden>
                  <i style={{ width: `${reputation.traits[key]}%` }} />
                </div>
                <strong>{reputation.traits[key]}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.mainButton}
        aria-expanded={expanded}
        aria-label={t.level.reputation.renownAriaLabel(reputation.renown)}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className={styles.label}>{t.level.reputation.label}</span>
        <span className={styles.track} aria-hidden>
          <i style={{ width: `${reputation.renown}%` }} />
        </span>
        <strong className={styles.value}>{reputation.renown}</strong>
      </button>

      {expanded && (
        <div className={styles.details}>
          {(Object.keys(reputation.traits) as Array<keyof PlayerReputation["traits"]>).map((key) => (
            <div key={key} className={styles.miniRow}>
              <span>{traitLabel(key)}</span>
              <span className={styles.miniTrack} aria-hidden>
                <i style={{ width: `${reputation.traits[key]}%` }} />
              </span>
              <strong>{reputation.traits[key]}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
