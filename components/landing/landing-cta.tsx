"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { PressableButton } from "@/components/ui/pressable-button";
import { useAudio } from "@/hooks/use-audio";
import { useT } from "@/components/i18n/locale-provider";

export function LandingCta() {
  const router = useRouter();
  const audio = useAudio();
  const t = useT();

  function enterGame() {
    audio.unlockAudio();
    router.push("/levels");
  }

  return (
    <section id="o-grze" className="landing-final-cta">
      <div className="mx-auto max-w-5xl px-4 py-20 md:px-8 md:py-28">
        <div className="landing-final-cta__portal">
          <div className="relative mx-auto h-36 w-36 md:h-44 md:w-44">
            <div className="landing-final-cta__glow" />
            <Image
              src="/map/elements/king_crown.png"
              alt={t.landing.cta.crownAlt}
              fill
              sizes="176px"
              className="object-contain"
            />
          </div>

          <p className="landing-kicker justify-center">{t.landing.cta.kicker}</p>
          <h2 className="mt-4 font-heading text-3xl font-bold text-[var(--cm-parchment-light)] md:text-5xl">
            {t.landing.cta.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--cm-parchment-mid)]">
            {t.landing.cta.description}
          </p>

          <PressableButton tone="primary" className="mt-8 h-13 px-9 text-base" onClick={enterGame} sound="none">
            {t.landing.cta.button}
          </PressableButton>
        </div>
      </div>
    </section>
  );
}
