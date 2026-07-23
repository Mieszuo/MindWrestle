"use client";

import { useEffect, useState } from "react";

export interface ParallaxOffset {
  x: number;
  y: number;
}

export function useMapParallax(enabled = true) {
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleMove(event: MouseEvent) {
      if (media.matches) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x, y });
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [enabled]);

  return offset;
}

export function parallaxTransform(offset: ParallaxOffset, multiplier: number) {
  return `translate(${offset.x * multiplier}px, ${offset.y * multiplier}px)`;
}
