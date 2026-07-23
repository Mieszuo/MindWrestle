"use client";

import Image from "next/image";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { createPortal } from "react-dom";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import type { LoreBeatPayload } from "@/lib/game/lore/lore-beat-payload";
import type { Character } from "@/lib/game/types";

interface StoryBeatScreenProps {
  beat: LoreBeatPayload;
  character: Character;
  busy?: boolean;
  onContinue: () => void;
}

export function StoryBeatScreen({ beat, character, busy = false, onContinue }: StoryBeatScreenProps) {
  const t = useT();
  const reducedMotion = useReducedMotion();
  const [failedImagePath, setFailedImagePath] = useState<string | null>(null);
  const imageSrc = failedImagePath === beat.imagePath ? character.portraitAsset : beat.imagePath;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="story-beat"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.65 }}
    >
      <motion.div
        className="story-beat__image"
        aria-hidden
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.045, filter: "blur(12px)" }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1.015, filter: "blur(0px)" }}
        transition={{ duration: reducedMotion ? 0.15 : 1.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="100vw"
          className={failedImagePath === beat.imagePath ? "story-beat__portrait" : "story-beat__art"}
          onError={() => setFailedImagePath(beat.imagePath)}
          priority
        />
      </motion.div>
      <div className="story-beat__backdrop" aria-hidden />
      <div className="story-beat__embers" aria-hidden />
      <motion.section
        className="story-beat__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-beat-title"
        aria-describedby="story-beat-entry"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: reducedMotion ? 0.15 : 0.85, delay: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="story-beat__seal" aria-hidden>
          <span>{beat.levelId}</span>
        </div>
        <div className="story-beat__eyebrow">
          <Sparkles size={14} aria-hidden />
          {t.level.storyBeat.fragmentLabel(beat.levelId)}
        </div>

        <div className="story-beat__content">
          <div className="story-beat__heading">
            <BookOpen aria-hidden />
            <div>
              <span>{t.level.storyBeat.chronicleRegainedVoice}</span>
              <h2 id="story-beat-title">{beat.title}</h2>
            </div>
          </div>

          <p className="story-beat__quote-label">{t.level.storyBeat.lastWordsOf(character.name)}</p>
          <blockquote>{beat.completionReveal}</blockquote>
          <p className="story-beat__truth">{beat.characterTruth}</p>
          <p id="story-beat-entry" className="story-beat__entry">
            {beat.chronicleEntry}
          </p>

          {beat.nextLevelClue && (
            <div className="story-beat__clue">
              <span>{t.level.storyBeat.nextClueLabel}</span>
              <p>{beat.nextLevelClue}</p>
            </div>
          )}

          <PressableButton
            tone="primary"
            className="story-beat__continue"
            disabled={busy}
            onClick={onContinue}
          >
            {t.level.storyBeat.saveToChronicle}
            <ChevronRight size={18} aria-hidden />
          </PressableButton>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
