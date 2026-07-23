"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

interface ParallaxStackProps extends React.ComponentProps<"div"> {
  intensity?: number;
}

export function ParallaxStack({
  className,
  intensity = 10,
  children,
}: ParallaxStackProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const rotateY = useTransform(x, [-intensity, intensity], [-4, 4]);
  const rotateX = useTransform(y, [-intensity, intensity], [4, -4]);

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    x.set(px * intensity);
    y.set(py * intensity);
  };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={reducedMotion ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 120, damping: 15 }}
      className={cn("relative perspective-[1200px]", className)}
    >
      {children}
    </motion.div>
  );
}
