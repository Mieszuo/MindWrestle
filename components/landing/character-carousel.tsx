"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { characters } from "@/lib/landing/content";
import { useT } from "@/components/i18n/locale-provider";

const CORNER_POSITIONS = ["tl", "tr", "br", "bl"] as const;
const MAX_VISIBLE = 4;
const TARGET_VISIBLE = 3;

function pickVisibleCount(fit: number): number {
  if (fit >= MAX_VISIBLE) return MAX_VISIBLE;
  if (fit >= TARGET_VISIBLE) return TARGET_VISIBLE;
  return Math.max(1, fit);
}

export function CharacterCarousel() {
  const t = useT();
  const slotRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(TARGET_VISIBLE);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [stepPx, setStepPx] = useState(0);
  const touchStartX = useRef(0);

  const maxStartIndex = Math.max(0, characters.length - visibleCount);

  const measure = useCallback(() => {
    const slot = slotRef.current;
    const track = trackRef.current;
    if (!slot || !track) return;

    const card = track.querySelector<HTMLElement>(".character-card");
    if (!card) return;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 20;
    const cardWidth = card.offsetWidth;
    const stride = cardWidth + gap;
    const fit = Math.floor((slot.clientWidth + gap) / stride);
    const nextVisible = pickVisibleCount(fit);
    const nextViewportWidth = nextVisible * cardWidth + (nextVisible - 1) * gap;

    setVisibleCount(nextVisible);
    setViewportWidth(nextViewportWidth);
    setStepPx(stride);
    setStartIndex((current) => Math.min(current, Math.max(0, characters.length - nextVisible)));
  }, []);

  useEffect(() => {
    measure();

    const slot = slotRef.current;
    if (!slot) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [measure]);

  const move = (direction: "left" | "right") => {
    setStartIndex((current) => {
      const max = Math.max(0, characters.length - visibleCount);
      if (direction === "left") return Math.max(0, current - 1);
      return Math.min(max, current + 1);
    });
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? 0;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;

    if (Math.abs(delta) < 48) return;
    move(delta > 0 ? "right" : "left");
  };

  const offsetPx = startIndex * stepPx;
  const canGoLeft = startIndex > 0;
  const canGoRight = startIndex < maxStartIndex;

  return (
    <section id="postacie" className="character-cards-section py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <p className="landing-kicker justify-center">{t.landing.characterCarousel.kicker}</p>
          <h2 className="landing-heading mt-3 text-3xl font-bold md:text-5xl">{t.landing.characterCarousel.heading}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-[var(--cm-ink-muted)]">
            {t.landing.characterCarousel.description}
          </p>
        </div>
      </div>

      <div className="character-carousel-stage">
        <div className="character-carousel-row">
          <button
            type="button"
            onClick={() => move("left")}
            disabled={!canGoLeft}
            className="landing-wood-icon character-carousel-nav hidden h-10 w-10 shrink-0 items-center justify-center md:flex disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t.landing.characterCarousel.prevAriaLabel}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div ref={slotRef} className="character-carousel-slot">
            <div
              className="character-carousel-viewport"
              style={viewportWidth > 0 ? { width: `${viewportWidth}px` } : undefined}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                ref={trackRef}
                className="character-carousel-track"
                style={stepPx > 0 ? { transform: `translate3d(-${offsetPx}px, 0, 0)` } : undefined}
              >
                {characters.map((character) => {
                  const copy = t.landing.characterCarousel.items[character.id];

                  return (
                    <article key={character.id} className="character-card shrink-0">
                      <div className="card-grime" aria-hidden />

                      {CORNER_POSITIONS.map((position) => (
                        <Image
                          key={position}
                          src="/ui/corner-metal.svg"
                          alt=""
                          width={32}
                          height={32}
                          className={`card-corner-img corner-${position}`}
                          draggable={false}
                        />
                      ))}

                      <div className="character-card-body">
                        <div
                          className="character-art-frame"
                          style={
                            {
                              "--character-glow": character.backdrop,
                            } as CSSProperties
                          }
                        >
                          <span className="character-badge">{character.level}</span>
                          <Image
                            src={character.portrait}
                            alt={copy.name === "?" ? t.landing.characterCarousel.mysteriousCharacterAlt : copy.name}
                            fill
                            sizes="(max-width: 768px) 230px, 240px"
                            className="character-art"
                            draggable={false}
                          />
                        </div>

                        <div className="character-nameplate">
                          <div className="character-nameplate-text">
                            <div className="character-title">{copy.name}</div>
                            <div className="character-level">{copy.archetype}</div>
                            <p className="character-lore-blurb">{copy.loreBlurb}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => move("right")}
            disabled={!canGoRight}
            className="landing-wood-icon character-carousel-nav hidden h-10 w-10 shrink-0 items-center justify-center md:flex disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t.landing.characterCarousel.nextAriaLabel}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
