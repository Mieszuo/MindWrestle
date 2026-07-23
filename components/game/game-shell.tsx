import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import * as React from "react";

import { PressableButton } from "@/components/ui/pressable-button";
import { cn } from "@/lib/utils";

interface GameShellProps extends React.ComponentProps<"div"> {
  title?: string;
  subtitle?: string;
  variant?: "default" | "level";
  backHref?: string;
  backLabel?: string;
}

export function GameShell({
  className,
  title,
  subtitle,
  variant = "default",
  backHref,
  backLabel = "Mapa",
  children,
  ...props
}: GameShellProps) {
  const isLevel = variant === "level";

  if (isLevel) {
    return (
      <div className="level-page-root">
        <div className={cn("level-page", className)} {...props}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10", className)} {...props}>
      {(backHref || title || subtitle) && (
        <header className="mb-7">
          {backHref && (
            <div className="mb-4">
              <Link href={backHref}>
                <PressableButton tone="wood" className="gap-1.5 px-4">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  {backLabel}
                </PressableButton>
              </Link>
            </div>
          )}
          {title && (
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">{title}</h1>
          )}
          {subtitle && <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
