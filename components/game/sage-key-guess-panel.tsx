"use client";

import { FormEvent } from "react";
import { KeyRound } from "lucide-react";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import { cn } from "@/lib/utils";

const MAX_GUESS_LENGTH = 500;

interface SageKeyGuessPanelProps {
  levelId: number;
  attemptId: string | null;
  inProgress: boolean;
  hasCharacterReply: boolean;
  busy: boolean;
  guessFeedback?: string | null;
  onSubmitGuess: (guess: string) => Promise<void>;
}

export function SageKeyGuessPanel({
  levelId,
  attemptId,
  inProgress,
  hasCharacterReply,
  busy,
  guessFeedback,
  onSubmitGuess,
}: SageKeyGuessPanelProps) {
  const t = useT();
  if (!isSageKeyGuessLevel(levelId) || !attemptId || !inProgress) return null;

  const disabled = busy || !hasCharacterReply;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("key-guess") as HTMLInputElement;
    const trimmed = input.value.trim();
    if (!trimmed || disabled) return;

    await onSubmitGuess(trimmed);
    input.value = "";
  }

  return (
    <aside className="sage-key-guess" aria-label={t.outcome.sage.panelAriaLabel}>
      <p className="sage-key-guess__eyebrow">{t.outcome.sage.eyebrow}</p>
      <p className="sage-key-guess__hint">{t.outcome.sage.hint}</p>
      <form className="sage-key-guess__form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="key-guess"
          className="sage-key-guess__input"
          placeholder={t.outcome.sage.inputPlaceholder}
          aria-label={t.outcome.sage.inputAriaLabel}
          maxLength={MAX_GUESS_LENGTH}
          disabled={disabled}
          style={{ caretColor: "#2a1608" }}
        />
        <PressableButton
          tone="wood"
          className="sage-key-guess__submit"
          aria-label={t.outcome.sage.submitAriaLabel}
          disabled={disabled}
          sound="none"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
        </PressableButton>
      </form>
      {!hasCharacterReply && (
        <p className="sage-key-guess__whisper">{t.outcome.sage.waitingForReply}</p>
      )}
      {guessFeedback && (
        <p className={cn("sage-key-guess__feedback", "sage-key-guess__feedback--wrong")} role="status">
          {guessFeedback}
        </p>
      )}
    </aside>
  );
}
