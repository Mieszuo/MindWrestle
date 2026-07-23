import type { CSSProperties } from "react";

import styles from "@/components/game/level-map/LevelMap.module.css";

interface MapLetterboxProps {
  sourceAspect: number;
  /** viewport = pełny ekran; frame = podgląd mobile w edytorze */
  mode?: "viewport" | "frame";
}

export function MapLetterbox({ sourceAspect, mode = "viewport" }: MapLetterboxProps) {
  const layerClass =
    mode === "frame" ? styles.letterboxLayerFrame : styles.letterboxLayer;

  return (
    <div
      className={layerClass}
      style={{ "--source-aspect": sourceAspect } as CSSProperties}
      aria-hidden
    >
      <div className={styles.letterboxTop} />
      <div className={styles.letterboxBottom} />
      <div className={styles.letterboxLeft} />
      <div className={styles.letterboxRight} />
    </div>
  );
}
