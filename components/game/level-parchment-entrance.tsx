"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

const easeReveal = [0.22, 1, 0.36, 1] as const;

interface LevelParchmentEntranceProps {
  children: React.ReactNode;
}

export function LevelParchmentEntrance({ children }: LevelParchmentEntranceProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="level-scene__parchment-entrance"
      initial={{ opacity: 0, y: 36, scale: 0.9, rotate: -2.2, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }}
      transition={{
        duration: 1.05,
        delay: 0.52,
        ease: easeReveal,
      }}
    >
      <motion.div
        className="level-scene__parchment-glow"
        aria-hidden
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: [0, 0.85, 0.35], scale: [0.75, 1.08, 1] }}
        transition={{ duration: 1.35, delay: 0.45, ease: "easeOut" }}
      />
      {children}
    </motion.div>
  );
}
