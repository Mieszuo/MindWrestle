"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import * as React from "react";

interface LevelSceneProps {
  children: React.ReactNode;
  backdropSrc?: string;
  backHref?: string;
  backLabel?: string;
  onBackClick?: () => void;
}

const easeCinematic = [0.22, 1, 0.36, 1] as const;

export function LevelScene({
  children,
  backdropSrc,
  backHref = "/levels",
  backLabel = "Mapa",
  onBackClick,
}: LevelSceneProps) {
  const reduceMotion = useReducedMotion();
  const showBack = Boolean(backHref || onBackClick);

  return (
    <div className="level-scene">
      {!reduceMotion && (
        <>
          <motion.div
            className="level-scene__entrance-veil"
            aria-hidden
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.35, delay: 0.1, ease: "easeOut" }}
          />
          <motion.div
            className="level-scene__entrance-sparkles"
            aria-hidden
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.75, 0], scale: [0.85, 1.12, 1.28] }}
            transition={{ duration: 1.7, delay: 0.42, ease: "easeOut" }}
          />
        </>
      )}

      {backdropSrc && (
        <motion.div
          className="level-scene__backdrop"
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.15, ease: easeCinematic }}
        >
          <motion.div
            key={backdropSrc}
            className="level-scene__backdrop-zoom"
            initial={reduceMotion ? false : { scale: 1.09 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.1, ease: easeCinematic }}
          >
            <Image
              src={backdropSrc}
              alt=""
              fill
              sizes="100vw"
              className="level-scene__backdrop-img"
              priority
              draggable={false}
            />
          </motion.div>
          <motion.div
            className="level-scene__backdrop-shade"
            initial={reduceMotion ? false : { opacity: 0.65 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.25, delay: 0.15, ease: "easeOut" }}
          />
        </motion.div>
      )}

      <motion.div
        className="level-scene__atmosphere"
        aria-hidden
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
      >
        <motion.div
          className="level-scene__fog"
          initial={reduceMotion ? false : { opacity: 0, filter: "blur(16px)" }}
          animate={{ opacity: 0.88, filter: "blur(8px)" }}
          transition={{ duration: 1.6, delay: 0.25, ease: "easeOut" }}
        />
        <div className="level-scene__warmth" />
        <div className="level-scene__vignette" />
        <div className="level-scene__blend" />
      </motion.div>

      {showBack &&
        (reduceMotion ? (
          onBackClick ? (
            <button type="button" className="level-scene__sign" onClick={onBackClick}>
              <span className="level-scene__sign-rope" aria-hidden />
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {backLabel}
            </button>
          ) : (
            <Link href={backHref!} className="level-scene__sign">
              <span className="level-scene__sign-rope" aria-hidden />
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {backLabel}
            </Link>
          )
        ) : (
          <motion.div
            className="level-scene__sign-wrap"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.05, ease: easeCinematic }}
          >
            {onBackClick ? (
              <button type="button" className="level-scene__sign" onClick={onBackClick}>
                <span className="level-scene__sign-rope" aria-hidden />
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                {backLabel}
              </button>
            ) : (
              <Link href={backHref!} className="level-scene__sign">
                <span className="level-scene__sign-rope" aria-hidden />
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                {backLabel}
              </Link>
            )}
          </motion.div>
        ))}

      <div className="level-scene__stage">{children}</div>
    </div>
  );
}
