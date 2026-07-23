"use client";

import * as React from "react";

import { useAudio } from "@/hooks/use-audio";
import type { ButtonTone } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type PressableButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  sound?: "soft" | "primary" | "none";
};

const toneClasses: Record<ButtonTone, string> = {
  primary: "fantasy-btn fantasy-btn--primary h-11 px-5 text-sm",
  secondary: "fantasy-btn fantasy-btn--secondary h-11 px-5 text-sm",
  wood: "fantasy-btn fantasy-btn--primary h-11 px-5 text-sm",
  icon: "fantasy-btn fantasy-btn--icon h-10 w-10 text-sm",
};

export function PressableButton({
  className,
  tone = "primary",
  sound,
  children,
  onClick,
  ...props
}: PressableButtonProps) {
  const audio = useAudio();
  const clickSound = sound ?? (tone === "primary" || tone === "wood" ? "primary" : "soft");

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!props.disabled && clickSound !== "none") {
      audio.unlockAudio();
      audio.playSfx(clickSound === "primary" ? "uiClickPrimary" : "uiClickSoft");
    }
    onClick?.(event);
  }

  return (
    <button
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cm-brass)]/55",
        toneClasses[tone],
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <span className="fantasy-btn__label inline-flex items-center justify-center gap-[inherit]">
        {children}
      </span>
    </button>
  );
}
