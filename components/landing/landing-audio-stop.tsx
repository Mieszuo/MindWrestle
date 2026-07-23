"use client";

import { useEffect } from "react";

import { useAudio } from "@/hooks/use-audio";

export function LandingAudioStop() {
  const { setAudioSuspended } = useAudio();

  useEffect(() => {
    setAudioSuspended(true);
    return () => setAudioSuspended(false);
  }, [setAudioSuspended]);

  return null;
}
