"use client";

import { motion, useReducedMotion } from "framer-motion";

import styles from "@/components/game/level-map/LevelMap.module.css";

export function MapFogOverlay() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <motion.div
      className={styles.fogOverlay}
      aria-hidden
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
    />
  );
}
