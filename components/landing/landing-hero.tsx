"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, Globe, Sparkles } from "lucide-react";

import { HeroMapArtwork } from "@/components/landing/hero-map-artwork";
import { PressableButton } from "@/components/ui/pressable-button";
import { useAudio } from "@/hooks/use-audio";
import { useT } from "@/components/i18n/locale-provider";

export function LandingHero() {
  const router = useRouter();
  const audio = useAudio();
  const t = useT();

  function enterWorld() {
    audio.unlockAudio();
    router.push("/levels");
  }

  return (
    <section className="landing-hero relative min-h-[clamp(650px,92vh,940px)] w-full overflow-hidden">
      <HeroMapArtwork />

      <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-7xl items-center px-4 py-20 md:px-8">
        <div className="landing-hero-copy w-full max-w-2xl">
          <p className="landing-kicker">
            <Sparkles className="h-4 w-4" />
            {t.landing.hero.kicker}
          </p>
          <h1 className="landing-display mt-5 text-5xl font-bold leading-[0.98] md:text-6xl lg:text-7xl">
            {t.landing.hero.titleLine1}
            <span className="block">{t.landing.hero.titleLine2}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--cm-parchment-mid)] md:text-xl">
            {t.landing.hero.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PressableButton tone="primary" className="h-13 px-8 text-base" onClick={enterWorld} sound="none">
              {t.landing.hero.startButton}
            </PressableButton>
            <a href="#rozgrywka" className="inline-flex">
              <PressableButton
                tone="secondary"
                className="h-12 gap-2 px-6 text-base"
                tabIndex={-1}
                sound="none"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
                {t.landing.hero.watchButton}
              </PressableButton>
            </a>
          </div>

          <div className="landing-hero-facts">
            <article className="landing-hero-fact">
              <div className="landing-hero-fact__emblem" aria-hidden>
                <Globe className="landing-hero-fact__icon" strokeWidth={1.75} />
              </div>
              <p>
                {t.landing.hero.facts.story.title}
                <small>{t.landing.hero.facts.story.detail}</small>
              </p>
            </article>

            <article className="landing-hero-fact">
              <div className="landing-hero-fact__emblem" aria-hidden>
                <span className="landing-hero-fact__glyph">7</span>
              </div>
              <p>
                {t.landing.hero.facts.silences.title}
                <small>{t.landing.hero.facts.silences.detail}</small>
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
