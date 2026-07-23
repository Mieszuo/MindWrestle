"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { BookOpen, X } from "lucide-react";
import { motion } from "framer-motion";
import { Fragment, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { CharacterCardContent } from "@/lib/game/character-card";
import { Character } from "@/lib/game/types";
import { useT } from "@/components/i18n/locale-provider";
import styles from "@/components/game/level-map/LevelMap.module.css";

interface CharacterCardModalProps {
  character: Character;
  card: CharacterCardContent;
  open: boolean;
  onClose: () => void;
}

export function CharacterCardModal({ character, card, open, onClose }: CharacterCardModalProps) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const guideRows = Math.max(card.works.length, card.avoid.length, 1);
  const atlasStyle = { "--guide-rows": guideRows } as CSSProperties;

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className={`${styles.leaderboardBackdrop} ${styles.uiFadeItem}`}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className={`${styles.leaderboardModal} ${styles.characterInfoModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-card-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          ref={closeRef}
          type="button"
          className={`fantasy-btn fantasy-btn--icon ${styles.leaderboardClose}`}
          aria-label={t.level.characterCard.closeAriaLabel}
          onClick={onClose}
        >
          <X aria-hidden />
        </button>

        <div className={styles.leaderboardHeading}>
          <BookOpen aria-hidden />
          <p>{t.level.characterCard.heading}</p>
          <h2 id="character-card-title">{character.name}</h2>
          <span className={styles.characterInfoSubtitle}>{character.title}</span>
        </div>

        <div className={styles.characterInfoAtlas} style={atlasStyle} aria-label={t.level.characterCard.previewAriaLabel}>
          <p className={`${styles.characterInfoGuideLabel} ${styles.characterInfoGuideLabelWorks}`}>{t.level.characterCard.worksLabel}</p>

          <div className={styles.characterInfoAtlasPortrait} aria-hidden>
            <Image src={character.portraitAsset} alt="" width={76} height={94} draggable={false} />
          </div>

          <p className={`${styles.characterInfoGuideLabel} ${styles.characterInfoGuideLabelAvoid}`}>{t.level.characterCard.avoidLabel}</p>

          {Array.from({ length: guideRows }, (_, index) => {
            const work = card.works[index];
            const avoid = card.avoid[index];
            const row = index + 2;

            return (
              <Fragment key={`guide-row-${index}`}>
                <div
                  className={`${styles.characterInfoGuideCell} ${styles.characterInfoGuideCellWorks}`}
                  style={{ gridRow: row }}
                >
                  {work ? (
                    <span className={`${styles.characterInfoGuideItem} ${styles.characterInfoGuideItemWorks}`}>
                      {work}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`${styles.characterInfoGuideCell} ${styles.characterInfoGuideCellAvoid}`}
                  style={{ gridRow: row }}
                >
                  {avoid ? (
                    <span className={`${styles.characterInfoGuideItem} ${styles.characterInfoGuideItemAvoid}`}>
                      {avoid}
                    </span>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>

        <section className={styles.characterInfoHistory} aria-label={t.level.characterCard.historyAriaLabel}>
          <h3>{t.level.characterCard.historyTitle}</h3>
          <p>{card.history}</p>
        </section>

        <div className={styles.characterInfoGrid}>
          <section className={styles.characterInfoBlock}>
            <h3>{t.level.characterCard.personalityTitle}</h3>
            <p>{card.personality}</p>
          </section>

          <section className={styles.characterInfoBlock}>
            <h3>{t.level.characterCard.howToTalkTitle}</h3>
            <p>{card.howToTalk}</p>
          </section>

          <section className={`${styles.characterInfoBlock} ${styles.characterInfoHint}`}>
            <h3>{t.level.characterCard.currentWhisperTitle}</h3>
            <p>{card.hint}</p>
          </section>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
