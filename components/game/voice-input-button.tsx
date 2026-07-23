"use client";

import { Loader2, Mic } from "lucide-react";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  isListening: boolean;
  isConnecting: boolean;
  disabled?: boolean;
  hidden?: boolean;
  onToggle: () => void;
}

export function VoiceInputButton({
  isListening,
  isConnecting,
  disabled,
  hidden,
  onToggle,
}: VoiceInputButtonProps) {
  const t = useT();

  if (hidden) return null;

  const label = isConnecting
    ? t.level.conversation.voiceInput.connecting
    : isListening
      ? t.level.conversation.voiceInput.listening
      : t.level.conversation.voiceInput.idle;

  return (
    <PressableButton
      type="button"
      tone="wood"
      className={cn(
        "parchment-ui__input-mic",
        isListening && "parchment-ui__input-mic--recording",
        isConnecting && "parchment-ui__input-mic--connecting",
      )}
      aria-label={label}
      aria-pressed={isListening}
      disabled={disabled || isConnecting}
      onClick={onToggle}
      sound="none"
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Mic className={cn("h-4 w-4", isListening && "parchment-ui__input-mic-icon--live")} aria-hidden />
      )}
    </PressableButton>
  );
}
