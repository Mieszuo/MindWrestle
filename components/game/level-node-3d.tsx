"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";

import { Level } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface LevelNode3DProps {
  level: Level;
}

export function LevelNode3D({ level }: LevelNode3DProps) {
  const isLocked = level.status === "locked";
  const reducedMotion = useReducedMotion();

  return (
    <Link
      href={isLocked ? "#" : `/level/${level.id}`}
      className={cn("group relative block", isLocked && "pointer-events-none opacity-65")}
      aria-disabled={isLocked}
    >
      <motion.div
        animate={reducedMotion ? { y: 0 } : { y: [0, -8, 0] }}
        transition={reducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="relative mx-auto mb-2 h-20 w-20"
      >
        <div className="absolute inset-2 rounded-full bg-violet-500/40 blur-xl" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-b from-violet-200 to-indigo-200" />
        <div className="absolute bottom-1 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-violet-950/25 blur-sm" />
      </motion.div>

      <div className="glass-panel relative mx-auto w-44 px-4 py-3 text-center">
        <p className="text-xs font-semibold tracking-[0.16em] text-violet-500">LEVEL {level.id}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{level.character.name}</p>
        <p className="text-xs text-slate-500">{level.character.title}</p>
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          {isLocked ? (
            <>
              <Lock className="h-3 w-3" />
              locked
            </>
          ) : (
            level.status
          )}
        </div>
      </div>
    </Link>
  );
}
