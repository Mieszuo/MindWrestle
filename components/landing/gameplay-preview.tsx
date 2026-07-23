"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { useAudio } from "@/hooks/use-audio";
import type { Character, ChatMessage, LevelObjective } from "@/lib/game/types";
import { useT } from "@/components/i18n/locale-provider";

const ConversationParchment = dynamic(
  () => import("@/components/game/conversation-parchment").then((m) => ({ default: m.ConversationParchment })),
  { ssr: false },
);

export function GameplayPreview() {
  const router = useRouter();
  const audio = useAudio();
  const t = useT();

  function openMap() {
    audio.unlockAudio();
    router.push("/levels");
  }

  const previewCharacter: Character = {
    id: "chytry-handlarz",
    name: t.landing.gameplayPreview.character.name,
    title: t.landing.gameplayPreview.character.title,
    personality: t.landing.gameplayPreview.character.personality,
    archetype: t.landing.gameplayPreview.character.archetype,
    portraitAsset: "/characters/trader.png",
    layers: {
      backgroundGlow: "",
      platformGlow: "",
      particleColor: "",
      silhouetteGradient: "",
    },
    motion: {
      floatDuration: 3.2,
      tiltMaxDeg: 4,
      particleDrift: 12,
    },
  };

  const previewObjective: LevelObjective = {
    type: "change_mind",
    goal: t.landing.gameplayPreview.objective.goal,
    hint: t.landing.gameplayPreview.objective.hint,
  };

  const previewMessages: ChatMessage[] = [
    {
      id: "trader-1",
      from: "character",
      content: t.landing.gameplayPreview.messages.trader,
      time: "10:21",
    },
    {
      id: "player-1",
      from: "player",
      content: t.landing.gameplayPreview.messages.player,
      time: "10:22",
    },
    {
      id: "hint-1",
      from: "system",
      content: t.landing.gameplayPreview.messages.hint,
      time: "10:22",
    },
  ];

  return (
    <section id="rozgrywka" className="gameplay-showcase">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="landing-kicker justify-center">{t.landing.gameplayPreview.kicker}</p>
          <h2 className="landing-heading mt-3 text-3xl font-bold md:text-5xl">
            {t.landing.gameplayPreview.heading}
          </h2>
          <p className="mt-4 text-lg text-[var(--cm-parchment-mid)]">
            {t.landing.gameplayPreview.description}
          </p>
        </div>

        <div className="landing-level-preview">
          <Image
            src="/levels/level_02/trader_shop.png"
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1216px"
            className="landing-level-preview__background"
          />
          <div className="landing-level-preview__shade" aria-hidden />

          <button type="button" className="landing-level-preview__map" onClick={openMap}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {t.landing.gameplayPreview.mapButton}
          </button>

          <div className="landing-level-preview__parchment">
            <ConversationParchment
              character={previewCharacter}
              objective={previewObjective}
              messages={previewMessages}
              musicTrack="level2"
              levelId={2}
              stats={[]}
            />
          </div>

          <aside className="landing-level-preview__caption" aria-hidden>
            <span>{t.landing.gameplayPreview.captionTitle}</span>
            <p>
              {t.landing.gameplayPreview.captionBody}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
