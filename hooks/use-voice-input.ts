"use client";

import { CommitStrategy, useScribe } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAudio } from "@/hooks/use-audio";
import { useT } from "@/components/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

const FINALIZE_DELAY_MS = 500;

interface UseVoiceInputOptions {
  attemptId?: string;
  levelId: number;
  disabled?: boolean;
  onListeningStart?: () => void;
  onLiveTranscript: (text: string) => void;
  onUtteranceComplete: (text: string) => void;
}

function buildLiveText(partial: string, committed: string[]) {
  const base = committed.join(" ").trim();
  const live = partial.trim();
  if (!base) return live;
  if (!live) return base;
  return `${base} ${live}`;
}

type VoiceErrors = Messages["content"]["voiceErrors"];

function mapScribeError(message: string, ve: VoiceErrors) {
  const lower = message.toLowerCase();
  if (lower.includes("unaccepted") || lower.includes("terms")) {
    return ve.termsNotAccepted;
  }
  if (lower.includes("auth") || lower.includes("401") || lower.includes("403")) {
    return ve.apiKeyNoPermission;
  }
  if (lower.includes("quota") || lower.includes("limit")) {
    return ve.quotaExhausted;
  }
  if (lower.includes("1006")) {
    return null;
  }
  return message || ve.recognitionFailed;
}

function shouldIgnoreScribeError(message: string, intentionalDisconnect: boolean) {
  if (intentionalDisconnect) return true;
  const lower = message.toLowerCase();
  return lower.includes("1006") || lower.includes("websocket closed");
}

export function useVoiceInput({
  attemptId,
  levelId,
  disabled,
  onListeningStart,
  onLiveTranscript,
  onUtteranceComplete,
}: UseVoiceInputOptions) {
  const { sttEnabled, unlockAudio } = useAudio();
  const ve = useT().content.voiceErrors;
  const [error, setError] = useState<string | null>(null);
  const committedRef = useRef<string[]>([]);
  const finalizeTimerRef = useRef<number | null>(null);
  const isFinalizingRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const scribeRef = useRef<ReturnType<typeof useScribe> | null>(null);
  const startSessionLockRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);

  const onLiveTranscriptRef = useRef(onLiveTranscript);
  const onUtteranceCompleteRef = useRef(onUtteranceComplete);
  const onListeningStartRef = useRef(onListeningStart);

  onLiveTranscriptRef.current = onLiveTranscript;
  onUtteranceCompleteRef.current = onUtteranceComplete;
  onListeningStartRef.current = onListeningStart;

  const clearFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current !== null) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }, []);

  const setMappedError = useCallback((message: string) => {
    if (shouldIgnoreScribeError(message, intentionalDisconnectRef.current)) return;
    const mapped = mapScribeError(message, ve);
    if (mapped) setError(mapped);
  }, [ve]);

  const disconnectScribe = useCallback((activeScribe: NonNullable<typeof scribeRef.current>) => {
    intentionalDisconnectRef.current = true;
    activeScribe.disconnect();
    window.setTimeout(() => {
      intentionalDisconnectRef.current = false;
    }, 750);
  }, []);

  const logUsage = useCallback(
    (text: string) => {
      if (!text) return;
      void fetch("/api/game/stt/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          attemptId,
          levelId,
          latencyMs: sessionStartedAtRef.current ? Date.now() - sessionStartedAtRef.current : null,
        }),
      });
    },
    [attemptId, levelId],
  );

  const finalizeListeningRef = useRef<() => void>(() => undefined);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.1,
    minSilenceDurationMs: 500,
    onPartialTranscript: (data) => {
      clearFinalizeTimer();
      onLiveTranscriptRef.current(buildLiveText(data.text, committedRef.current));
    },
    onCommittedTranscript: (data) => {
      const trimmed = data.text.trim();
      if (trimmed) committedRef.current.push(trimmed);
      onLiveTranscriptRef.current(buildLiveText("", committedRef.current));
      finalizeListeningRef.current();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : ve.recognitionFailed;
      setMappedError(message);
    },
    onAuthError: (data) => setMappedError(data.error),
    onUnacceptedTermsError: (data) => setMappedError(data.error),
    onQuotaExceededError: (data) => setMappedError(data.error),
    onTranscriberError: (data) => setMappedError(data.error),
    onDisconnect: () => {
      clearFinalizeTimer();
    },
  });

  scribeRef.current = scribe;

  const finalizeListening = useCallback(() => {
    const activeScribe = scribeRef.current;
    if (!activeScribe || isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    clearFinalizeTimer();

    const text = buildLiveText(activeScribe.partialTranscript ?? "", committedRef.current).trim();
    disconnectScribe(activeScribe);
    committedRef.current = [];
    sessionStartedAtRef.current = null;

    if (text) {
      setError(null);
      onLiveTranscriptRef.current(text);
      onUtteranceCompleteRef.current(text);
      logUsage(text);
    }

    isFinalizingRef.current = false;
  }, [clearFinalizeTimer, disconnectScribe, logUsage]);

  const scheduleFinalize = useCallback(() => {
    clearFinalizeTimer();
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeListening();
    }, FINALIZE_DELAY_MS);
  }, [clearFinalizeTimer, finalizeListening]);

  finalizeListeningRef.current = scheduleFinalize;

  const cancelListening = useCallback(() => {
    clearFinalizeTimer();
    const activeScribe = scribeRef.current;
    if (!activeScribe) return;

    const text = buildLiveText(activeScribe.partialTranscript ?? "", committedRef.current).trim();
    disconnectScribe(activeScribe);
    committedRef.current = [];
    sessionStartedAtRef.current = null;
    if (text) onLiveTranscriptRef.current(text);
  }, [clearFinalizeTimer, disconnectScribe]);

  const startListening = useCallback(async () => {
    const activeScribe = scribeRef.current;
    if (
      startSessionLockRef.current ||
      !activeScribe ||
      disabled ||
      !sttEnabled ||
      !attemptId ||
      activeScribe.isConnected ||
      activeScribe.status === "connecting"
    ) {
      return;
    }

    startSessionLockRef.current = true;
    setIsStarting(true);
    unlockAudio();
    setError(null);
    committedRef.current = [];
    clearFinalizeTimer();

    try {
      const tokenResponse = await fetch(
        `/api/game/stt/token?attemptId=${encodeURIComponent(attemptId)}&levelId=${levelId}`,
      );
      const tokenPayload = (await tokenResponse.json()) as { token?: string; error?: string };
      if (!tokenResponse.ok || !tokenPayload.token) {
        throw new Error(tokenPayload.error ?? ve.recognitionStartFailed);
      }

      const scribeAfterToken = scribeRef.current;
      if (
        !scribeAfterToken ||
        scribeAfterToken.isConnected ||
        scribeAfterToken.status === "connecting" ||
        scribeAfterToken.status === "transcribing"
      ) {
        return;
      }

      onListeningStartRef.current?.();
      sessionStartedAtRef.current = Date.now();

      await scribeAfterToken.connect({
        token: tokenPayload.token,
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 1.1,
        minSilenceDurationMs: 500,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (startError) {
      sessionStartedAtRef.current = null;
      scribeRef.current?.disconnect();
      setMappedError(startError instanceof Error ? startError.message : ve.micStartFailed);
    } finally {
      startSessionLockRef.current = false;
      setIsStarting(false);
    }
  }, [attemptId, clearFinalizeTimer, disabled, levelId, setMappedError, sttEnabled, unlockAudio]);

  const toggleListening = useCallback(() => {
    const activeScribe = scribeRef.current;
    if (!activeScribe) return;

    if (
      startSessionLockRef.current ||
      activeScribe.isConnected ||
      activeScribe.status === "connecting" ||
      activeScribe.status === "transcribing"
    ) {
      if (!startSessionLockRef.current) cancelListening();
      return;
    }
    void startListening();
  }, [cancelListening, startListening]);

  useEffect(() => {
    return () => {
      clearFinalizeTimer();
      scribeRef.current?.disconnect();
    };
  }, [clearFinalizeTimer]);

  const isListening =
    isStarting ||
    scribe.isConnected ||
    scribe.status === "connecting" ||
    scribe.status === "transcribing";

  return {
    isListening,
    isConnecting: isStarting || scribe.status === "connecting",
    error,
    sttEnabled,
    toggleListening,
  };
}
