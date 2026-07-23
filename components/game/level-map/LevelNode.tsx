"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen } from "lucide-react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

import {
  MAP_FOG_EASE,
  mapFogReveal,
  mapRevealDelay,
} from "@/lib/game/map-entrance";
import {
  LevelNodeData,
  MapConfig,
  getPlatformWidth,
  getDepthScale,
  mapDepth,
  mapPosition,
  mapSize,
} from "@/lib/game/mapScene";
import { getLevelCharacterPortrait } from "@/lib/game/mapCharacters";
import styles from "@/components/game/level-map/LevelMap.module.css";

interface LevelNodeProps {
  map: MapConfig;
  level: LevelNodeData;
  editMode?: boolean;
  itemKey?: string;
  selected?: boolean;
  isPlayerSelected?: boolean;
  isDimmed?: boolean;
  onActivate?: (levelId: number) => void;
  onPointerDown?: (event: React.PointerEvent, key: string) => void;
}

export function LevelNode({
  map,
  level,
  editMode = false,
  itemKey,
  selected = false,
  isPlayerSelected = false,
  isDimmed = false,
  onActivate,
  onPointerDown,
}: LevelNodeProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const isBlocked = level.state === "blocked";
  const isDone = level.state === "done";
  const scale = level.scale ?? 1;
  const width = (level.width ?? getPlatformWidth(map, level.y)) * scale;
  const characterPortrait = getLevelCharacterPortrait(level.id);

  const depthScale = getDepthScale({
    y: level.y,
    farY: map.depth.farY,
    nearY: map.depth.nearY,
    farScale: map.depth.farScale,
    nearScale: map.depth.nearScale,
  });

  const nodeStyle = {
    ...mapPosition(level.x, level.y),
    width: mapSize(width),
    zIndex: isPlayerSelected ? mapDepth(level.y, 120) : mapDepth(level.y, 10),
    "--character-depth": depthScale,
  } as CSSProperties;

  const buttonClass = [
    styles.levelNode,
    editMode ? styles.levelNodeEdit : "",
    selected ? styles.levelNodeSelected : "",
    isDimmed ? styles.levelNodeDimmed : "",
    isPlayerSelected && isBlocked ? styles.levelNodeChosenBlocked : "",
    isPlayerSelected && !isBlocked ? styles.levelNodeChosen : "",
    isBlocked ? styles.levelNodeBlocked : "",
    isDone ? styles.levelNodeDone : "",
  ]
    .filter(Boolean)
    .join(" ");

  const entranceMotion =
    !editMode && !reducedMotion
      ? {
          initial: "hidden" as const,
          animate: "visible" as const,
          variants: mapFogReveal,
          transition: {
            delay: mapRevealDelay(level.y, map.depth),
            duration: 0.9,
            ease: MAP_FOG_EASE,
          },
        }
      : {};

  const NodeTag = editMode || reducedMotion ? "button" : motion.button;

  function openLevel() {
    if (editMode) return;
    if (onActivate) {
      onActivate(level.id);
      return;
    }
    if (isBlocked) return;
    router.push(`/level/${level.id}`);
  }

  return (
    <NodeTag
      type="button"
      className={buttonClass}
      style={nodeStyle}
      disabled={editMode ? false : isBlocked && !onActivate}
      aria-label={`Poziom ${level.id}`}
      aria-pressed={isPlayerSelected}
      onClick={openLevel}
      onPointerDown={
        editMode && itemKey && onPointerDown
          ? (e: React.PointerEvent<HTMLButtonElement>) => onPointerDown(e, itemKey)
          : undefined
      }
      {...entranceMotion}
    >
      {isPlayerSelected && !isBlocked && <span className={styles.levelSelectionHalo} aria-hidden />}

      {characterPortrait ? (
        <span className={styles.levelCharacter} aria-hidden>
          <span className={styles.levelContactShadow} />
          <span className={styles.levelCharacterFigure}>
            <Image
              src={characterPortrait}
              alt=""
              width={200}
              height={280}
              draggable={false}
              className={styles.levelCharacterImage}
            />
          </span>
        </span>
      ) : (
        editMode && <span className={styles.levelEmptyMarker}>#{level.id}</span>
      )}

      {isDone && (
        <span className={styles.levelCheck} aria-hidden>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="M5.5 12.4l4.1 4.1 8.9-9"
              stroke="currentColor"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {isDone && (
        <span className={styles.levelChronicle} aria-label="Fragment Kroniki odzyskany">
          <BookOpen aria-hidden />
        </span>
      )}

      {isBlocked && (
        <span className={styles.levelLock} aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M7.25 11V8.9c0-3.05 1.9-5.15 4.75-5.15s4.75 2.1 4.75 5.15V11"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            <path
              d="M5.8 10.4h12.4c.95 0 1.55.58 1.55 1.52v6.46c0 .94-.6 1.52-1.55 1.52H5.8c-.95 0-1.55-.58-1.55-1.52v-6.46c0-.94.6-1.52 1.55-1.52Z"
              fill="currentColor"
            />
            <path
              d="M12 13.35c.66 0 1.2.5 1.2 1.13 0 .38-.2.72-.5.92l.32 1.88h-2.04l.32-1.88a1.1 1.1 0 0 1-.5-.92c0-.63.54-1.13 1.2-1.13Z"
              fill="rgba(55, 32, 15, 0.72)"
            />
          </svg>
        </span>
      )}
    </NodeTag>
  );
}
