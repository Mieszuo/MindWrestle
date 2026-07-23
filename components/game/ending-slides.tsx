"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { PressableButton } from "@/components/ui/pressable-button";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import {
  CinematicNarrationText,
  type CinematicNarrationTrack,
} from "@/components/game/cinematic-narration-text";
import { getEndingNarration } from "@/lib/game/cinematic-narration";
import type { PlayerLoreState } from "@/lib/game/lore/player-lore-state";
import type { PlayerReputation } from "@/lib/game/reputation";
import narrationManifest from "@/public/audio/narrator/manifest.json";

interface EndingSlidesProps {
  loreState: PlayerLoreState;
  reputation?: PlayerReputation | null;
  displayName?: string | null;
  onFinish: () => void;
}

interface EndingSlide {
  image: string;
  fallback: string;
  title: string;
  main: string;
  support: string;
}

export function EndingSlides({ loreState, reputation, displayName, onFinish }: EndingSlidesProps) {
  const t = useT();
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const endingNarration = useMemo(() => getEndingNarration(locale), [locale]);

  const slides = useMemo<EndingSlide[]>(() => {
    const fullChronicle = loreState.discoveredFragments.length >= 6;
    const highPressure = (reputation?.traits.pressure ?? 0) >= 12;
    const s = t.chronicle.ending.slides;
    return [
      {
        image: "/narrative/ending/01-seven-voices.webp",
        fallback: "/images/level-map.png",
        title: s.voices.title,
        main: s.voices.main,
        support: fullChronicle ? s.voices.supportFull : s.voices.supportPartial,
      },
      {
        image: "/narrative/ending/02-god-whispers.webp",
        fallback: "/characters/god.png",
        title: s.firstWord.title,
        main: s.firstWord.main,
        support: highPressure ? s.firstWord.supportHighPressure : s.firstWord.supportCalm,
      },
      {
        image: "/narrative/ending/03-chronicle-name.webp",
        fallback: "/narrative/intro/slide_1.webp",
        title: s.name.title,
        main: s.name.main,
        support: displayName ? s.name.supportWithName(displayName) : s.name.supportNoName,
      },
      {
        image: "/narrative/ending/04-world-lights.webp",
        fallback: "/images/level-map.png",
        title: s.breath.title,
        main: s.breath.main,
        support: fullChronicle ? s.breath.supportFull : s.breath.supportPartial,
      },
      {
        image: "/narrative/ending/05-road-dawn.webp",
        fallback: "/images/hero.png",
        title: s.road.title,
        main: s.road.main,
        support: s.road.support,
      },
    ];
  }, [displayName, loreState.discoveredFragments.length, reputation?.traits.pressure, t]);

  const slide = slides[current];
  const narrationEntry = endingNarration[current];
  const narrationTrack = narrationManifest[
    narrationEntry.id as keyof typeof narrationManifest
  ] as CinematicNarrationTrack;
  const isLast = current === slides.length - 1;
  const imageSrc = failedImage === slide.image ? slide.fallback : slide.image;
  const imageMotion = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.22 },
      }
    : {
        initial: { opacity: 0, scale: 1.025, filter: "blur(14px)" },
        animate: { opacity: 1, scale: 1.065, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.09, filter: "blur(16px)" },
        transition: { duration: 1.35, ease: [0.16, 1, 0.3, 1] as const },
      };
  const cardMotion = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 24, filter: "blur(10px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -14, filter: "blur(10px)" },
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
      };

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/player/chronicle/ending-seen", { method: "PATCH" });
    } finally {
      onFinish();
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") void finish();
      if (event.key === "ArrowRight" && !isLast) setCurrent((value) => value + 1);
      if (event.key === "ArrowLeft") setCurrent((value) => Math.max(0, value - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="ending-slides" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div key={imageSrc} className="ending-slides__scene" {...imageMotion}>
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="100vw"
            className={failedImage === slide.image ? "ending-slides__fallback" : "ending-slides__image"}
            onError={() => setFailedImage(slide.image)}
            priority
          />
        </motion.div>
      </AnimatePresence>
      <div className="ending-slides__shade" />
      <div className="ending-slides__aurora" aria-hidden />
      <div className="ending-slides__grain" aria-hidden />
      <button className="ending-slides__skip" type="button" onClick={() => void finish()} disabled={saving}>
        {t.chronicle.ending.skipButton}
      </button>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={narrationEntry.id} className="ending-slides__card" {...cardMotion}>
          <p className="ending-slides__eyebrow">
            <Sparkles aria-hidden />
            {t.chronicle.ending.eyebrowLabel(current + 1, slides.length)}
          </p>
          <h2 id="ending-title">{slide.title}</h2>
          <div className="ending-slides__ornament" aria-hidden>
            <span />
            <Sparkles />
            <span />
          </div>
          <CinematicNarrationText
            key={`${narrationEntry.id}-${narrationEntry.audio}`}
            track={narrationTrack}
            className="ending-slides__narration"
          />
          {displayName && current === 2 && (
            <p className="ending-slides__support">{t.chronicle.ending.nameAppearsOnPage(displayName)}</p>
          )}

          <div className="ending-slides__progress" aria-label={t.chronicle.ending.progressAriaLabel}>
            {slides.map((entry, index) => (
              <button
                key={entry.title}
                type="button"
                aria-label={t.chronicle.ending.goToPartAriaLabel(index + 1)}
                aria-current={index === current ? "step" : undefined}
                className={index === current ? "ending-slides__dot ending-slides__dot--active" : "ending-slides__dot"}
                onClick={() => setCurrent(index)}
                disabled={saving}
              />
            ))}
          </div>

          <div className="ending-slides__footer">
            <PressableButton
              tone="secondary"
              disabled={current === 0 || saving}
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft aria-hidden />
              {t.chronicle.ending.backButton}
            </PressableButton>
            {isLast ? (
              <PressableButton tone="primary" disabled={saving} onClick={() => void finish()}>
                {saving ? t.chronicle.ending.savingLabel : t.outcome.shared.returnToMap}
              </PressableButton>
            ) : (
              <PressableButton tone="primary" onClick={() => setCurrent((value) => value + 1)}>
                {t.chronicle.ending.nextButton}
                <ArrowRight aria-hidden />
              </PressableButton>
            )}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
