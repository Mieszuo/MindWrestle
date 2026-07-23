"use client";

import { Trophy } from "lucide-react";

import { ScoreBreakdown } from "@/lib/game/types";
import { Badge } from "@/components/ui/badge";
import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";

interface ScoreCardProps {
  result: ScoreBreakdown;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const t = useT();

  return (
    <section className="glass-panel p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">
            {t.outcome.scoreCard.levelScoreLabel}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
            {t.outcome.scoreCard.successHeading}
          </h2>
          <p className="mt-2 text-slate-600">
            {t.outcome.scoreCard.characterSaidPrefix}{" "}
            <span className="font-semibold text-slate-900">&quot;{result.quote}&quot;</span>
          </p>
        </div>
        <Badge className="h-7 gap-1 rounded-full bg-violet-100 px-3 text-violet-700">
          <Trophy className="h-3.5 w-3.5" />
          {result.rank}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Stat label={t.outcome.scoreCard.timeLabel} value={result.time} />
        <Stat label={t.outcome.scoreCard.messagesLabel} value={`${result.messages}`} />
        <Stat label={t.outcome.scoreCard.styleLabel} value={result.style} />
        <Stat label={t.outcome.scoreCard.clarityLabel} value={`${result.clarity}%`} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <PressableButton tone="secondary">{t.outcome.scoreCard.shareResult}</PressableButton>
        <PressableButton tone="secondary">{t.outcome.scoreCard.watchReplay}</PressableButton>
        <PressableButton>{t.outcome.scoreCard.nextLevel}</PressableButton>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/85 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
