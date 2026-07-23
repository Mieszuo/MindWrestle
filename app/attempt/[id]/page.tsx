"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PressableButton } from "@/components/ui/pressable-button";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import type { AttemptScore } from "@/lib/game/attempt-scoring";
import { formatDuration } from "@/lib/game/progress";
import type { AttemptSnapshot } from "@/lib/game/types";

interface ReplayPayload {
  attempt: AttemptSnapshot;
  level: {
    id: number;
    slug: string;
    characterName: string;
    archetype: string;
  };
  score: AttemptScore | null;
}

export default function AttemptReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const locale = useLocale();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [payload, setPayload] = useState<ReplayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ id }) => setAttemptId(id));
  }, [params]);

  useEffect(() => {
    if (!attemptId) return;
    fetch(`/api/game/attempts/${attemptId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(t.chronicle.replay.loadFailedError);
        return response.json() as Promise<ReplayPayload>;
      })
      .then(setPayload)
      .catch((fetchError) =>
        setError(fetchError instanceof Error ? fetchError.message : t.chronicle.replay.genericError),
      );
  }, [attemptId, t]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p>{error}</p>
        <Link href="/levels" className="underline">
          {t.outcome.shared.returnToMap}
        </Link>
      </main>
    );
  }

  if (!payload) {
    return <main className="grid min-h-dvh place-items-center px-4">{t.chronicle.replay.loadingLabel}</main>;
  }

  const shareImage = payload.score
    ? `/api/og/victory?quote=${encodeURIComponent(
        payload.attempt.messages.filter((m) => m.role === "CHARACTER").at(-1)?.content ?? payload.level.characterName,
      )}&rank=${encodeURIComponent(payload.score.rank)}&time=${encodeURIComponent(formatDuration(payload.attempt.durationMs ?? 0))}&locale=${locale}`
    : null;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10 dialog-text">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-800/70">{t.chronicle.replay.kicker}</p>
        <h1 className="mt-2 text-3xl font-bold text-amber-950">{payload.level.characterName}</h1>
        <p className="mt-1 text-sm text-amber-900/80">{payload.level.archetype}</p>
        {payload.score && (
          <p className="mt-3 text-sm text-amber-900">
            {t.chronicle.replay.scoreSummary(
              payload.score.rank,
              payload.score.style,
              payload.score.clarity,
              formatDuration(payload.attempt.durationMs ?? 0),
            )}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-amber-900/15 bg-[#f3dfb8]/90 p-5 shadow-lg">
        {payload.attempt.messages.map((message) => (
          <article key={message.id} className="border-b border-amber-900/10 py-3 last:border-b-0">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-amber-800/70">
              {message.role === "USER"
                ? t.chronicle.replay.playerRoleLabel
                : message.role === "CHARACTER"
                  ? payload.level.characterName
                  : t.chronicle.replay.systemRoleLabel}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-950">{message.content}</p>
            {message.narration && (
              <em className="mt-1 block text-xs italic text-amber-900/75">{message.narration}</em>
            )}
          </article>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <PressableButton tone="secondary" onClick={() => window.open(shareImage ?? undefined, "_blank")} disabled={!shareImage}>
          {t.chronicle.replay.sharePreviewButton}
        </PressableButton>
        <Link href={`/level/${payload.level.id}`}>
          <PressableButton tone="primary">{t.level.map.dock.playAgainButton}</PressableButton>
        </Link>
        <Link href="/levels">
          <PressableButton tone="secondary">{t.landing.gameplayPreview.mapButton}</PressableButton>
        </Link>
      </div>
    </main>
  );
}
