"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  evaluateCoachingHints,
  updateEmotionDangerTracking,
  type CoachingHint,
  type ConversationStatSnapshot,
} from "@/lib/game/coaching-hints";
import type { EmotionBarDanger } from "@/lib/game/defeat-thresholds";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { AttemptSnapshot, Character, LevelObjective } from "@/lib/game/types";
import type { Locale } from "@/lib/i18n/locale";

export interface CoachingHintInput {
  levelId: number;
  character: Character;
  objective: LevelObjective;
  attempt: AttemptSnapshot | null;
  reactionTags: string[];
  stats: ConversationStatSnapshot[];
  responseMode?: ResponseMode;
  attemptJustStarted?: boolean;
  locale: Locale;
}

export function useCoachingHints(input: CoachingHintInput) {
  const [activeHint, setActiveHint] = useState<CoachingHint | null>(null);
  const [history, setHistory] = useState<CoachingHint[]>([]);

  // Stable IDs of all hints that have been surfaced in this attempt
  const shownHintIdsRef = useRef<Set<string>>(new Set());
  // Tracks the last-known danger level per emotion stat key
  const previousEmotionDangersRef = useRef<Map<string, EmotionBarDanger>>(new Map());
  const attemptIdRef = useRef<string | null>(null);
  const previousAttemptRef = useRef<AttemptSnapshot | null>(null);
  const previousResponseModeRef = useRef<ResponseMode | undefined>(undefined);
  const goalProgressHistoryRef = useRef<number[]>([]);
  const lastEvaluatedTurnRef = useRef<number | null>(null);

  // Reset all per-attempt state when a new attempt starts
  useEffect(() => {
    const nextId = input.attempt?.id ?? null;
    if (nextId === attemptIdRef.current) return;

    attemptIdRef.current = nextId;
    shownHintIdsRef.current = new Set();
    previousEmotionDangersRef.current = new Map();
    previousAttemptRef.current = null;
    previousResponseModeRef.current = undefined;
    goalProgressHistoryRef.current = input.attempt ? [input.attempt.goalProgress] : [];
    lastEvaluatedTurnRef.current = null;
    setActiveHint(null);
    setHistory([]);
  }, [input.attempt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordHint = useCallback((hint: CoachingHint) => {
    shownHintIdsRef.current.add(hint.id);
    setActiveHint(hint);
    if (hint.persistent) {
      setHistory((current) => {
        if (current.some((entry) => entry.id === hint.id)) return current;
        return [...current, hint];
      });
    }
  }, []);

  // Auto-dismiss hint when a new turn begins (player just sent a message)
  const prevTurnsCountRef = useRef<number | null>(null);
  useEffect(() => {
    const currentTurns = input.attempt?.turnsCount ?? null;
    const prevTurns = prevTurnsCountRef.current;
    prevTurnsCountRef.current = currentTurns;

    if (
      activeHint !== null &&
      currentTurns !== null &&
      prevTurns !== null &&
      currentTurns > prevTurns
    ) {
      setActiveHint(null);
    }
  }, [input.attempt?.turnsCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Runs after every turn update — checks for meaningful triggers only
  useEffect(() => {
    if (!input.attempt || input.attempt.status !== "IN_PROGRESS") return;

    const currentTurns = input.attempt.turnsCount;
    if (lastEvaluatedTurnRef.current === currentTurns) return;
    lastEvaluatedTurnRef.current = currentTurns;

    // Update goal progress history
    const lastGoal = goalProgressHistoryRef.current.at(-1);
    if (lastGoal !== input.attempt.goalProgress) {
      goalProgressHistoryRef.current.push(input.attempt.goalProgress);
      goalProgressHistoryRef.current = goalProgressHistoryRef.current.slice(-8);
    }

    // Update emotion danger tracking (handles recovery → re-trigger logic)
    updateEmotionDangerTracking(
      input.levelId,
      input.stats,
      previousEmotionDangersRef.current,
      shownHintIdsRef.current,
    );

    const hint = evaluateCoachingHints({
      levelId: input.levelId,
      character: input.character,
      objective: input.objective,
      attempt: input.attempt,
      previousAttempt: previousAttemptRef.current,
      reactionTags: input.reactionTags,
      stats: input.stats,
      shownHintIds: shownHintIdsRef.current,
      previousEmotionDangers: previousEmotionDangersRef.current,
      goalProgressHistory: goalProgressHistoryRef.current,
      responseMode: input.responseMode,
      previousResponseMode: previousResponseModeRef.current,
      locale: input.locale,
    });

    previousAttemptRef.current = input.attempt;
    previousResponseModeRef.current = input.responseMode;

    if (hint) recordHint(hint);
  }, [
    // Only re-evaluate when the conversation actually advances
    input.attempt?.turnsCount,
    input.attempt?.status,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    input.attempt?.id,
    input.levelId,
    input.reactionTags,
    input.responseMode,
    input.stats,
    input.locale,
    recordHint,
  ]);

  const dismiss = useCallback(() => setActiveHint(null), []);

  return {
    activeHint,
    history,
    dismiss,
  };
}
