"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import {
  MAP_FOG_EASE,
  mapRevealDelay,
  mapSpriteFogReveal,
} from "@/lib/game/map-entrance";
import {
  DecorationData,
  MapConfig,
  getSpriteWidth,
  mapDepth,
  mapPosition,
  mapSize,
} from "@/lib/game/mapScene";
import styles from "@/components/game/level-map/LevelMap.module.css";

interface MapSpriteProps {
  map: MapConfig;
  decoration: DecorationData;
  editMode?: boolean;
  itemKey?: string;
  selected?: boolean;
  onPointerDown?: (event: React.PointerEvent, key: string) => void;
}

function anchorTransform(anchor: DecorationData["anchor"]) {
  if (anchor === "bottom-center") return "translate(-50%, -100%)";
  return "translate(-50%, -50%)";
}

export function MapSprite({
  map,
  decoration,
  editMode = false,
  itemKey,
  selected = false,
  onPointerDown,
}: MapSpriteProps) {
  const reducedMotion = useReducedMotion();
  const anchor = decoration.anchor ?? "center";
  const extraScale = decoration.scale ?? 1;
  const rotate = decoration.rotate ?? 0;
  const opacity = decoration.opacity ?? 1;
  const pixelWidth = getSpriteWidth(map, decoration.width, decoration.y) * extraScale;

  const spriteStyle = {
    ...mapPosition(decoration.x, decoration.y),
    zIndex: mapDepth(decoration.y, decoration.z ?? 0),
    width: mapSize(pixelWidth),
    transform: `${anchorTransform(anchor)} rotate(${rotate}deg)`,
  };

  const className = `${styles.sprite} ${editMode ? styles.spriteEdit : ""} ${selected ? styles.spriteSelected : ""}`;

  const entranceMotion =
    !editMode && !reducedMotion
      ? {
          initial: "hidden" as const,
          animate: "visible" as const,
          variants: mapSpriteFogReveal,
          transition: {
            delay: mapRevealDelay(decoration.y, map.depth) + 0.08,
            duration: 0.85,
            ease: MAP_FOG_EASE,
          },
        }
      : {};

  const SpriteTag = editMode || reducedMotion ? "div" : motion.div;

  return (
    <SpriteTag
      className={className}
      style={{ ...spriteStyle, opacity }}
      aria-hidden={!editMode}
      onPointerDown={
        editMode && itemKey && onPointerDown
          ? (e: React.PointerEvent<HTMLDivElement>) => onPointerDown(e, itemKey)
          : undefined
      }
      {...entranceMotion}
    >
      <Image
        src={decoration.src}
        alt=""
        width={decoration.width}
        height={Math.round(decoration.width * 0.75)}
        draggable={false}
        className={styles.spriteImage}
      />
    </SpriteTag>
  );
}
