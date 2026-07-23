"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { Character } from "@/lib/game/types";

interface CharacterStageProps {
  character: Character;
  portraitSrc?: string;
  sceneSrc?: string;
}

export function CharacterStage({ character, portraitSrc, sceneSrc }: CharacterStageProps) {
  const reducedMotion = useReducedMotion();
  const portrait = portraitSrc ?? character.portraitAsset;

  if (sceneSrc) {
    return (
      <div className="level-scene-stage">
        <Image
          src={sceneSrc}
          alt={character.name}
          width={842}
          height={1264}
          sizes="(max-width: 1024px) 100vw, 42vw"
          className="level-scene-stage__art"
          priority
          draggable={false}
        />
        <div className="level-scene-stage__mist" aria-hidden />
        <div className="level-scene-stage__mist level-scene-stage__mist--soft" aria-hidden />
        <div className="level-scene-stage__warmth" aria-hidden />
        <div className="level-scene-stage__bridge" aria-hidden />
      </div>
    );
  }

  const loopTransition = reducedMotion
    ? { duration: 0 }
    : { duration: character.motion.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const };

  return (
    <div className="level-character-stage">
      <div className="level-character-stage__sky" aria-hidden />
      <div className="level-character-stage__ground" aria-hidden />

      <motion.div
        className="level-character-stage__platform"
        animate={reducedMotion ? { y: 0 } : { y: [0, 2, 0] }}
        transition={loopTransition}
        aria-hidden
      />

      <motion.div
        className="level-character-stage__figure"
        animate={reducedMotion ? { y: 0 } : { y: [0, -6, 0] }}
        transition={loopTransition}
      >
        <Image
          src={portrait}
          alt={character.name}
          width={320}
          height={460}
          sizes="(max-width: 1024px) 55vw, 320px"
          className="level-character-stage__portrait"
          priority
          draggable={false}
        />
      </motion.div>
    </div>
  );
}
