"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { parallaxTransform, useMapParallax } from "@/hooks/use-map-parallax";

export function HeroMapArtwork() {
  const reducedMotion = useReducedMotion();
  const parallax = useMapParallax(!reducedMotion);

  return (
    <motion.div
      className="landing-hero-map"
      aria-hidden
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 2.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
      }
    >
      <div
        className="landing-hero-map__parallax"
        style={
          !reducedMotion
            ? { transform: parallaxTransform(parallax, 1.035) }
            : undefined
        }
      >
        <Image
          src="/images/hero.png"
          alt=""
          fill
          priority
          className="landing-hero-map__image"
          sizes="100vw"
        />
      </div>
      <div className="landing-hero-map__atmosphere" aria-hidden>
        <div className="landing-hero-map__fog" />
        {!reducedMotion && (
          <div className="landing-hero-map__particles">
            <i style={{ left: "62%", top: "42%", animationDelay: "-0.6s" }} />
            <i style={{ left: "74%", top: "58%", animationDelay: "-1.9s" }} />
            <i style={{ left: "55%", top: "32%", animationDelay: "-2.8s" }} />
            <i style={{ left: "82%", top: "48%", animationDelay: "-3.5s" }} />
          </div>
        )}
        <div className="landing-hero-map__radial-glow" />
        <div className="landing-hero-map__grain" />
      </div>
      <div className="landing-hero-map__fade" />
    </motion.div>
  );
}
