import { CharacterCarousel } from "@/components/landing/character-carousel";
import { GameplayPreview } from "@/components/landing/gameplay-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingAudioStop } from "@/components/landing/landing-audio-stop";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";

export function LandingPage() {
  return (
    <div className="landing-page min-h-full">
      <LandingAudioStop />
      <LandingHeader />
      <main>
        <LandingHero />
        <HowItWorks />
        <GameplayPreview />
        <CharacterCarousel />
        <LandingCta />
      </main>
    </div>
  );
}
