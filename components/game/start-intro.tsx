"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

import { PressableButton } from "@/components/ui/pressable-button";
import {
  CinematicNarrationText,
  type CinematicNarrationTrack,
} from "@/components/game/cinematic-narration-text";
import { useIntroImagePreload } from "@/hooks/use-intro-image-preload";
import { useAudio } from "@/hooks/use-audio";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { getIntroNarration } from "@/lib/game/cinematic-narration";
import narrationManifest from "@/public/audio/narrator/manifest.json";
import styles from "@/components/game/start-intro.module.css";

type IntroSlide = {
  narrationId: string;
  image: string;
};

const slides: IntroSlide[] = [
  { narrationId: "intro-01", image: "/narrative/intro/slide_1.webp" },
  { narrationId: "intro-02", image: "/narrative/intro/slide_2.webp" },
  { narrationId: "intro-03", image: "/narrative/intro/slide_3.webp" },
  { narrationId: "intro-04", image: "/narrative/intro/slide_4.webp" },
  { narrationId: "intro-05", image: "/narrative/intro/slide_5.webp" },
];

const FOG_EASE = [0.45, 0.05, 0.15, 1] as const;
const INTRO_MUSIC_FADE_MS = 2400;
const SLIDE_IMAGE_MS = 1.45;
const SLIDE_CARD_MS = 1.05;
const ATMOSPHERE_MS = 1.2;

const slideImageUrls = slides.map((entry) => entry.image);

export function StartIntro() {
  const t = useT();
  const locale = useLocale();
  const introSlides = t.level.intro.slides;
  const introNarration = useMemo(() => getIntroNarration(locale), [locale]);
  const router = useRouter();
  const audio = useAudio();
  const { crossfadeTo, setCinematicAutoplay } = audio;
  const reducedMotion = useReducedMotion();
  const readyImages = useIntroImagePreload(slideImageUrls);
  const [current, setCurrent] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const slide = slides[current];
  const slideContent = introSlides[current];
  const narrationEntry = introNarration[current];
  const narrationTrack = narrationManifest[
    slide.narrationId as keyof typeof narrationManifest
  ] as CinematicNarrationTrack;
  const isLast = current === slides.length - 1;
  const isFirstSlide = current === 0;

  const imageMotion = useMemo(
    () =>
      reducedMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.25 },
          }
        : {
            initial: { opacity: 0, scale: 1.02, filter: "blur(16px)" },
            animate: { opacity: 1, scale: 1.04, filter: "blur(0px)" },
            exit: { opacity: 0, scale: 1.075, filter: "blur(20px)" },
            transition: { duration: SLIDE_IMAGE_MS, ease: FOG_EASE },
          },
    [reducedMotion],
  );

  const cardMotion = useMemo(
    () =>
      reducedMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.2 },
          }
        : {
            initial: { opacity: 0, y: 22, filter: "blur(10px)" },
            animate: { opacity: 1, y: 0, filter: "blur(0px)" },
            exit: { opacity: 0, y: -14, filter: "blur(12px)" },
            transition: { duration: SLIDE_CARD_MS, ease: FOG_EASE },
          },
    [reducedMotion],
  );

  useEffect(() => {
    setCinematicAutoplay(true);
    crossfadeTo("intro", INTRO_MUSIC_FADE_MS);

    return () => {
      setCinematicAutoplay(false);
    };
  }, [crossfadeTo, setCinematicAutoplay]);

  function goToSlide(index: number) {
    if (isSaving || index === current || index < 0 || index >= slides.length) return;
    setError(null);
    audio.unlockAudio();
    audio.playSfx("uiClickSoft");
    setCurrent(index);
  }

  function goNext() {
    if (isLast) {
      void finishIntro();
      return;
    }
    goToSlide(current + 1);
  }

  function goBack() {
    goToSlide(current - 1);
  }

  async function finishIntro() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    audio.unlockAudio();
    audio.playSfx("worldEnter");
    audio.crossfadeTo("map", 4000);

    try {
      const response = await fetch("/api/player/intro", { method: "PATCH" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? t.level.intro.saveFailed);

      startTransition(() => router.push("/levels"));
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : t.level.intro.saveFailedRetry,
      );
      setIsSaving(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        void finishIntro();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null || isSaving) return;
    const delta = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goNext();
    else goBack();
  }

  return (
    <main
      className={`${styles.shell} ${isFirstSlide ? styles.shellFirstSlide : ""}`}
      onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div className={styles.scene} aria-hidden>
        <AnimatePresence mode="sync" initial={false}>
          <motion.div key={slide.image} className={styles.imageLayer} {...imageMotion}>
            {failedImages[slide.image] ? (
              <div className={styles.imageFallback} />
            ) : (
              <Image
                src={slide.image}
                alt=""
                fill
                priority={current <= 1}
                sizes="100vw"
                className={`${styles.image} ${readyImages.has(slide.image) ? styles.imageReady : styles.imageLoading}`}
                onError={() => setFailedImages((state) => ({ ...state, [slide.image]: true }))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={isFirstSlide ? "intro-open" : "intro-journey"}
          className={styles.atmosphere}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(14px)" }}
          transition={{ duration: reducedMotion ? 0.2 : ATMOSPHERE_MS, ease: FOG_EASE }}
          aria-hidden
        >
          <div className={isFirstSlide ? styles.vignetteFirstSlide : styles.vignette} />
          <div className={isFirstSlide ? styles.readabilityFirstSlide : styles.readability} />
          <div className={isFirstSlide ? styles.emberGlowFirstSlide : styles.emberGlow} />
        </motion.div>
      </AnimatePresence>

      <div className={styles.grain} aria-hidden />

      <button
        className={styles.skipButton}
        type="button"
        onClick={() => {
          audio.unlockAudio();
          void finishIntro();
        }}
        disabled={isSaving}
      >
        {t.level.intro.skipButton}
      </button>

      <section className={`${styles.content} ${isFirstSlide ? styles.contentFirstSlide : ""}`} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={slideContent.title} className={styles.card} {...cardMotion}>
            <p className={styles.kicker}>
              <Sparkles className={styles.kickerIcon} aria-hidden />
              {t.level.intro.chapterProgress(current + 1, slides.length)}
            </p>
            <h1 className={styles.title}>{slideContent.title}</h1>
            <CinematicNarrationText
              key={`${narrationEntry.id}-${audio.voiceEnabled}`}
              track={narrationTrack}
              className={styles.narrationText}
            />
            <noscript>
              <p className={styles.mainText}>{slideContent.main}</p>
              <p className={styles.supportText}>{slideContent.support}</p>
            </noscript>
            {error && <p className={styles.error}>{error}</p>}
          </motion.div>
        </AnimatePresence>

        <div className={styles.footer}>
          <div className={styles.progress} aria-label={t.level.intro.progressAriaLabel}>
            {slides.map((entry, index) => (
              <button
                key={entry.narrationId}
                type="button"
                className={`${styles.dot} ${index === current ? styles.dotActive : ""}`}
                aria-label={t.level.intro.goToSlideAriaLabel(index + 1)}
                aria-current={index === current ? "step" : undefined}
                onClick={() => goToSlide(index)}
                disabled={isSaving}
              />
            ))}
          </div>

          <div className={styles.controls}>
            <PressableButton
              type="button"
              tone="secondary"
              className={styles.backButton}
              onClick={goBack}
              disabled={current === 0 || isSaving}
            >
              <ArrowLeft className={styles.buttonIcon} aria-hidden />
              {t.level.intro.backButton}
            </PressableButton>
            <PressableButton type="button" tone="primary" className={styles.nextButton} onClick={goNext} disabled={isSaving}>
              {isLast ? (isSaving ? t.level.intro.openingTheWay : t.level.intro.beginAdventure) : t.level.intro.nextButton}
              {!isLast && <ArrowRight className={styles.buttonIcon} aria-hidden />}
            </PressableButton>
          </div>
        </div>
      </section>
    </main>
  );
}
