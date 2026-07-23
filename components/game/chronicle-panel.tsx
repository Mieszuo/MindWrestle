"use client";

import Image from "next/image";
import { BookOpen, LockKeyhole, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import {
  defaultPlayerLoreState,
  type ChronicleEntry,
  type PlayerLoreState,
} from "@/lib/game/lore/player-lore-state";

const FALLBACK_PORTRAITS: Record<number, string> = {
  1: "/characters/girl.png",
  2: "/characters/trader.png",
  3: "/characters/knight.png",
  4: "/characters/ork.png",
  5: "/characters/sage.png",
  6: "/characters/king.png",
  7: "/characters/god.png",
};

interface ChroniclePanelProps {
  onClose: () => void;
}

export function ChroniclePanel({ onClose }: ChroniclePanelProps) {
  const t = useT();
  const [loreState, setLoreState] = useState<PlayerLoreState>(defaultPlayerLoreState);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<ChronicleEntry | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/player/chronicle")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { loreState?: PlayerLoreState } | null) => {
        if (active && payload?.loreState) setLoreState(payload.loreState);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (typeof document === "undefined") return null;

  const entriesByLevel = new Map(loreState.chronicleEntries.map((entry) => [entry.levelId, entry]));

  return createPortal(
    <motion.div
      className="chronicle-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <button className="chronicle-panel__backdrop" type="button" aria-label={t.chronicle.panel.closeAriaLabel} onClick={onClose} />
      <motion.section
        className="chronicle-panel__book"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chronicle-title"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
      >
        <header className="chronicle-panel__header">
          <div>
            <span>{t.chronicle.panel.bookLabel}</span>
            <h2 id="chronicle-title">{t.chronicle.panel.title}</h2>
          </div>
          <PressableButton tone="icon" onClick={onClose} aria-label={t.chronicle.panel.closeAriaLabel}>
            <X aria-hidden />
          </PressableButton>
        </header>

        <div className="chronicle-panel__progress" aria-label={t.chronicle.panel.progressAriaLabel(loreState.finalTruthProgress)}>
          <strong>{loreState.finalTruthProgress} / 7</strong>
          <div>
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={index}
                className={index < loreState.finalTruthProgress ? "is-found" : ""}
                aria-hidden
              />
            ))}
          </div>
          <p>
            {loreState.finalTruthProgress === 7
              ? t.chronicle.panel.allVoicesSpoken
              : t.chronicle.panel.voiceHint}
          </p>
        </div>

        <div className="chronicle-panel__entries">
          {loading ? (
            Array.from({ length: 7 }, (_, index) => (
              <article className="chronicle-entry chronicle-entry--locked" key={index} style={{ opacity: 0.6 }}>
                <div className="chronicle-entry__locked-image flex items-center justify-center">
                  <div className="w-6 h-6 rounded-md bg-black/10 animate-pulse" />
                </div>
                <div className="flex flex-col gap-2 w-full pt-1">
                  <div className="h-3 w-16 bg-black/10 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-black/15 rounded animate-pulse" />
                  <div className="h-3 w-3/4 max-w-[200px] bg-black/5 rounded animate-pulse mt-1" />
                </div>
              </article>
            ))
          ) : (
            Array.from({ length: 7 }, (_, index) => {
              const levelId = index + 1;
              const entry = entriesByLevel.get(levelId);
              if (!entry) {
                return (
                  <article className="chronicle-entry chronicle-entry--locked" key={levelId}>
                    <div className="chronicle-entry__locked-image">
                      <LockKeyhole aria-hidden />
                    </div>
                    <div>
                      <span>{t.chronicle.panel.fragmentLabel(levelId)}</span>
                      <h3>{t.chronicle.panel.lockedTitle}</h3>
                      <p>{t.chronicle.panel.lockedBody}</p>
                    </div>
                  </article>
                );
              }

              const imageSrc = failedImages.has(entry.imagePath)
                ? FALLBACK_PORTRAITS[levelId]
                : entry.imagePath;
              return (
                <button
                  className="chronicle-entry chronicle-entry--found"
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="chronicle-entry__image">
                    <Image
                      src={imageSrc}
                      alt=""
                      fill
                      sizes="112px"
                      onError={() =>
                        setFailedImages((current) => new Set(current).add(entry.imagePath))
                      }
                    />
                  </div>
                  <div>
                    <span>{t.chronicle.panel.recoveredFragmentLabel(levelId)}</span>
                    <h3>{entry.title}</h3>
                    <p>{entry.narrativeText}</p>
                  </div>
                  <BookOpen aria-hidden />
                </button>
              );
            })
          )}
        </div>

        {selectedEntry && (
          <article className="chronicle-panel__detail">
            <button type="button" aria-label={t.chronicle.panel.closeEntryAriaLabel} onClick={() => setSelectedEntry(null)}>
              <X aria-hidden />
            </button>
            <span>{t.chronicle.panel.recoveredFragmentTag}</span>
            <h3>{selectedEntry.title}</h3>
            <blockquote>{selectedEntry.completionReveal}</blockquote>
            <p>{selectedEntry.narrativeText}</p>
            {selectedEntry.clueText && (
              <aside>
                <strong>{t.chronicle.panel.clueHeading}</strong>
                <p>{selectedEntry.clueText}</p>
              </aside>
            )}
          </article>
        )}
      </motion.section>
    </motion.div>,
    document.body,
  );
}
