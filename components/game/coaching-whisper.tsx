"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import type { CoachingHint } from "@/lib/game/coaching-hints";
import { useT } from "@/components/i18n/locale-provider";

interface CoachingWhisperProps {
  hint: CoachingHint | null;
  onDismiss: () => void;
  /** Auto-dismiss after ms. Warnings stay longer (15s), positive hints shorter (10s). */
  autoDismissMs?: number;
}

const KIND_DISMISS_MS: Partial<Record<CoachingHint["kind"], number>> = {
  warning: 18_000,
  breakthrough: 14_000,
  lore_echo: 12_000,
};

export function CoachingWhisper({ hint, onDismiss, autoDismissMs }: CoachingWhisperProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const dismissMs = autoDismissMs ?? (hint ? (KIND_DISMISS_MS[hint.kind] ?? 12_000) : 12_000);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(onDismiss, dismissMs);
    return () => window.clearTimeout(timer);
  }, [hint, dismissMs, onDismiss]);

  return (
    <AnimatePresence mode="wait">
      {hint && (
        <motion.aside
          key={hint.id}
          className={`coaching-whisper coaching-whisper--${hint.kind}`}
          role="status"
          aria-live="polite"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, x: -32, filter: "blur(8px)" }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, x: 0, filter: "blur(0px)" }
          }
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, x: -20, filter: "blur(6px)" }
          }
          transition={{
            duration: reduceMotion ? 0.15 : 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onDismiss();
          }}
          tabIndex={0}
        >
          <button
            type="button"
            className="coaching-whisper__close"
            aria-label={t.common.close}
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="coaching-whisper__title">{hint.title}</span>
          <p className="coaching-whisper__body">{hint.body}</p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
