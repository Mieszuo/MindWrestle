"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { useAudio } from "@/hooks/use-audio";

interface NarrationCue {
  text: string;
  startMs: number;
  endMs: number;
}

export interface CinematicNarrationTrack {
  audio: string;
  text: string;
  durationMs: number;
  cues: NarrationCue[];
}

interface CinematicNarrationTextProps {
  track: CinematicNarrationTrack;
  className?: string;
}

export function CinematicNarrationText({ track, className }: CinematicNarrationTextProps) {
  const { voiceEnabled, unlockAudio, playSpeech, stopSpeech } = useAudio();

  return (
    <NarrationPlayback
      key={`${track.audio}-${voiceEnabled}`}
      track={track}
      className={className}
      voiceEnabled={voiceEnabled}
      unlockAudio={unlockAudio}
      playSpeech={playSpeech}
      stopSpeech={stopSpeech}
    />
  );
}

function NarrationPlayback({
  track,
  className,
  voiceEnabled,
  unlockAudio,
  playSpeech,
  stopSpeech,
}: CinematicNarrationTextProps & {
  voiceEnabled: boolean;
  unlockAudio: () => void;
  playSpeech: (src: string) => Promise<void>;
  stopSpeech: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [revealedCueCount, setRevealedCueCount] = useState(() =>
    voiceEnabled ? 0 : track.cues.length,
  );
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    stopSpeech();

    if (!voiceEnabled) return;

    unlockAudio();
    timersRef.current = track.cues.map((cue, index) =>
      window.setTimeout(() => setRevealedCueCount(index + 1), cue.startMs),
    );
    void playSpeech(track.audio).then(() => setRevealedCueCount(track.cues.length));

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      stopSpeech();
    };
  }, [playSpeech, stopSpeech, track, unlockAudio, voiceEnabled]);

  const revealedCues = track.cues.slice(0, revealedCueCount);

  return (
    <p className={`${className ?? ""} cinematic-narration`} aria-live="polite">
      {revealedCues.length === 0
        ? "\u00a0"
        : revealedCues.map((cue, index) => (
            <span
              key={`${index}-${cue.startMs}-${cue.text}`}
              className={[
                "cinematic-narration__cue",
                index === revealedCues.length - 1
                  ? "cinematic-narration__cue--active"
                  : "cinematic-narration__cue--past",
                reducedMotion ? "cinematic-narration__cue--static" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cue.text}
              {index < revealedCues.length - 1 ? " " : ""}
            </span>
          ))}
    </p>
  );
}
