"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { LevelNode } from "@/components/game/level-map/LevelNode";
import { MapEditorPanel } from "@/components/game/level-map/MapEditorPanel";
import { MapFogOverlay } from "@/components/game/level-map/MapFogOverlay";
import { MapLetterbox } from "@/components/game/level-map/MapLetterbox";
import { MapSprite } from "@/components/game/level-map/MapSprite";
import { MapUi } from "@/components/game/level-map/MapUi";
import { useMapConfig } from "@/hooks/use-map-config";
import { useMapEditor } from "@/hooks/use-map-editor";
import { useAudio } from "@/hooks/use-audio";
import { usePlayerProgress } from "@/hooks/use-player-progress";
import { usePlayerReputation } from "@/hooks/use-player-reputation";
import { mapBackgroundReveal, MAP_FOG_EASE } from "@/lib/game/map-entrance";
import { applyProgressToMap, getActiveLevelId } from "@/lib/game/progress";
import { useGameLevels } from "@/hooks/use-game-levels";
import { MAP_SOURCE, type MapConfig } from "@/lib/game/mapScene";
import type { LevelState } from "@/lib/game/mapScene";
import type { Level } from "@/lib/game/types";
import styles from "@/components/game/level-map/LevelMap.module.css";

const sourceAspect = MAP_SOURCE.width / MAP_SOURCE.height;

function MapCanvas({
  map,
  editor,
  canvasRef,
  selectedLevelId,
  onCharacterSelect,
}: {
  map: MapConfig;
  editor: ReturnType<typeof useMapEditor>;
  canvasRef?: RefObject<HTMLDivElement | null>;
  selectedLevelId: number | null;
  onCharacterSelect: (levelId: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const animateEntrance = !editor.editMode && !reducedMotion;

  const background = (
    <div className={styles.background} aria-hidden>
      <Image
        src={MAP_SOURCE.background}
        alt=""
        fill
        priority
        sizes="100vw"
        draggable={false}
        className={styles.backgroundImage}
      />
    </div>
  );

  return (
    <div
      ref={canvasRef}
      className={`${styles.mapCanvas} ${editor.editMode ? styles.mapCanvasEdit : ""}`}
      style={{ "--source-aspect": sourceAspect } as CSSProperties}
    >
      {animateEntrance ? (
        <motion.div
          className={styles.background}
          aria-hidden
          initial="hidden"
          animate="visible"
          variants={mapBackgroundReveal}
          transition={{ duration: 1.25, ease: MAP_FOG_EASE }}
        >
          <Image
            src={MAP_SOURCE.background}
            alt=""
            fill
            priority
            sizes="100vw"
            draggable={false}
            className={styles.backgroundImage}
          />
        </motion.div>
      ) : (
        background
      )}

      {map.decorations.map((decoration) => (
        <MapSprite
          key={decoration.id}
          map={map}
          decoration={decoration}
          editMode={editor.editMode}
          itemKey={`decor:${decoration.id}`}
          selected={editor.isSelected(`decor:${decoration.id}`)}
          onPointerDown={editor.handleItemPointerDown}
        />
      ))}

      {map.levels.map((level) => (
        <LevelNode
          key={level.id}
          map={map}
          level={level}
          editMode={editor.editMode}
          itemKey={`level:${level.id}`}
          selected={editor.isSelected(`level:${level.id}`)}
          isPlayerSelected={!editor.editMode && selectedLevelId === level.id}
          isDimmed={!editor.editMode && selectedLevelId !== null && selectedLevelId !== level.id}
          onActivate={editor.editMode ? undefined : onCharacterSelect}
          onPointerDown={editor.handleItemPointerDown}
        />
      ))}
    </div>
  );
}

function LevelMapInner() {
  const t = useT();
  const audio = useAudio();
  const { crossfadeTo } = audio;
  const viewportMap = useMapConfig();
  const { progress, loading: progressLoading } = usePlayerProgress();
  const { reputation, refresh: refreshReputation } = usePlayerReputation();
  const editor = useMapEditor();
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const userPickedLevelRef = useRef(false);

  const mapWithProgress = useMemo(
    () => applyProgressToMap(viewportMap, progress),
    [viewportMap, progress],
  );

  const map = editor.editMode ? editor.activeMap : mapWithProgress;
  const { levels } = useGameLevels(progress);
  const completedCount = progress.completions.length;
  const showMobilePreview = editor.editMode && editor.variant === "mobile";
  const isMobileLayout = viewportMap.id === "mobile";

  const selectedLevel: Level | null = levels.find((level) => level.id === selectedLevelId) ?? null;
  const selectedState: LevelState | null =
    mapWithProgress.levels.find((level) => level.id === selectedLevelId)?.state ?? null;
  const selectedCompletion =
    progress.completions.find((completion) => completion.levelId === selectedLevelId) ?? null;

  useEffect(() => {
    audio.unlockAudio();
    crossfadeTo("map");
    void refreshReputation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        void refreshReputation();
      }
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [refreshReputation]);

  const activeLevelId = useMemo(() => getActiveLevelId(progress), [progress]);

  useEffect(() => {
    if (progressLoading || userPickedLevelRef.current) return;
    setSelectedLevelId(activeLevelId);
  }, [activeLevelId, progressLoading]);

  function handleCharacterSelect(levelId: number) {
    const level = levels.find((entry) => entry.id === levelId);
    userPickedLevelRef.current = true;
    audio.unlockAudio();
    audio.playSfx(level?.status === "locked" ? "uiLocked" : "uiSelectLevel");
    setSelectedLevelId(levelId);
  }

  const canvas = (
    <MapCanvas
      map={map}
      editor={editor}
      canvasRef={editor.editMode ? editor.canvasRef : undefined}
      selectedLevelId={selectedLevelId}
      onCharacterSelect={handleCharacterSelect}
    />
  );

  const viewportStyle = { "--source-aspect": sourceAspect } as CSSProperties;

  let stage: ReactNode = (
    <>
      <MapLetterbox sourceAspect={sourceAspect} />
      {canvas}
    </>
  );
  if (showMobilePreview) {
    stage = (
      <div className={styles.mobilePreviewFrame} style={viewportStyle}>
        <p className={styles.mobilePreviewLabel}>{t.level.map.mobilePreviewLabel}</p>
        <MapLetterbox sourceAspect={sourceAspect} mode="frame" />
        {canvas}
      </div>
    );
  }

  return (
    <main
      className={`${styles.viewport} ${isMobileLayout && !showMobilePreview ? styles.viewportMobile : ""} ${showMobilePreview ? styles.viewportMobilePreview : ""}`}
      style={viewportStyle}
    >
      {stage}

      {!editor.editMode && <MapFogOverlay />}

      {editor.editMode && <MapEditorPanel editor={editor} />}

      {!editor.editMode && (
        <MapUi
          completedCount={completedCount}
          totalCount={levels.length}
          levels={levels}
          completions={progress.completions}
          progressLevels={progress.levels}
          selectedLevel={selectedLevel}
          selectedState={selectedState}
          selectedCompletion={selectedCompletion}
          reputation={reputation}
        />
      )}
    </main>
  );
}

export function LevelMap() {
  return (
    <Suspense fallback={null}>
      <LevelMapInner />
    </Suspense>
  );
}
