"use client";

import { useState, useEffect } from "react";
import { EndingSlides } from "@/components/game/ending-slides";
import type { PlayerLoreState } from "@/lib/game/lore/player-lore-state";
import type { PlayerReputation } from "@/lib/game/reputation";
import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";

interface WrapperProps {
  loreState: PlayerLoreState;
  reputation: PlayerReputation;
  displayName: string;
}

export function EndingSlidesWrapper({ loreState, reputation, displayName }: WrapperProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!started) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}>
        <PressableButton tone="primary" onClick={() => setStarted(true)}>
          {t.chronicle.epilogue.startButton}
        </PressableButton>
      </div>
    );
  }

  return (
    <EndingSlides
      loreState={loreState}
      reputation={reputation}
      displayName={displayName}
      onFinish={() => {
        window.location.href = "/levels";
      }}
    />
  );
}
