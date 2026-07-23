"use client";

import { useCallback, useRef } from "react";

import { useAudio } from "@/hooks/use-audio";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { EmotionState } from "@/lib/game/types";
import type { VoicePerformance } from "@/lib/game/voice-performance";
import type { SpeechCue } from "@/lib/voice/speech-plan";

export interface SpeakCharacterParams {
  text: string;
  levelId: number;
  attemptId?: string;
  emotions: EmotionState;
  emotionDelta?: Record<string, number>;
  responseMode?: ResponseMode;
  voicePerformance?: VoicePerformance;
  onSentenceStart?: (revealedText: string, sentenceIndex: number) => void;
  onComplete?: () => void;
}

export function useCharacterVoice() {
  const { voiceEnabled, playSpeech, stopSpeech, unlockAudio } = useAudio();
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const completionRef = useRef<(() => void) | null>(null);

  const finishActiveSpeech = useCallback(() => {
    const complete = completionRef.current;
    completionRef.current = null;
    complete?.();
  }, []);

  const speakCharacter = useCallback(
    async (params: SpeakCharacterParams) => {
      const trimmed = params.text.trim();
      if (!voiceEnabled || !trimmed) {
        params.onComplete?.();
        return;
      }

      unlockAudio();
      const generation = ++generationRef.current;
      abortRef.current?.abort();
      finishActiveSpeech();
      stopSpeech();
      completionRef.current = params.onComplete ?? null;
      const controller = new AbortController();
      abortRef.current = controller;

      let audioUrl: string | null = null;
      try {
        try {
          const response = await fetch("/api/game/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              text: trimmed,
              levelId: params.levelId,
              emotions: params.emotions,
              emotionDelta: params.emotionDelta,
              responseMode: params.responseMode,
              voicePerformance: params.voicePerformance,
              attemptId: params.attemptId,
            }),
          });

          if (response.status === 503) return;
          if (!response.ok) throw new Error(`TTS request failed (${response.status})`);

          const cues = decodeSpeechCues(response.headers.get("X-Voice-Cues"));
          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
          if (generationRef.current !== generation) return;

          let revealedCueCount = 0;
          const revealThrough = (cueCount: number) => {
            if (cueCount <= revealedCueCount || generationRef.current !== generation) return;
            revealedCueCount = Math.min(cueCount, cues.length);
            const revealedText = cues.slice(0, revealedCueCount).map((cue) => cue.displayText).join(" ");
            if (revealedText) {
              params.onSentenceStart?.(revealedText, revealedCueCount - 1);
            }
          };

          await playSpeech(audioUrl, {
            onStarted: () => {
              if (cues.length > 0) revealThrough(1);
              else params.onSentenceStart?.(trimmed, 0);
            },
            onTimeUpdate: (currentTimeMs) => {
              let nextCount = revealedCueCount;
              while (
                nextCount < cues.length
                && currentTimeMs + 40 >= cues[nextCount]!.startMs
              ) {
                nextCount += 1;
              }
              revealThrough(nextCount);
            },
          });
          revealThrough(cues.length);
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError") && process.env.NODE_ENV !== "production") {
            console.warn("[voice] TTS failed:", error);
          }
        }
      } finally {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (generationRef.current === generation) {
          abortRef.current = null;
          finishActiveSpeech();
        }
      }
    },
    [finishActiveSpeech, playSpeech, stopSpeech, unlockAudio, voiceEnabled],
  );

  const cancelSpeech = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopSpeech();
    finishActiveSpeech();
  }, [finishActiveSpeech, stopSpeech]);

  return { speakCharacter, cancelSpeech };
}

function decodeSpeechCues(header: string | null): SpeechCue[] {
  if (!header) return [];
  try {
    const base64 = header.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((cue): cue is SpeechCue =>
      Boolean(
        cue
        && typeof cue === "object"
        && typeof (cue as SpeechCue).displayText === "string"
        && Number.isFinite((cue as SpeechCue).startMs)
        && Number.isFinite((cue as SpeechCue).endMs),
      ));
  } catch {
    return [];
  }
}
