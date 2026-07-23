"use client";

import { BookOpen, Crown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import { defaultPlayerLoreState, type PlayerLoreState } from "@/lib/game/lore/player-lore-state";

export function KingBriefingPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [loreState, setLoreState] = useState<PlayerLoreState>(defaultPlayerLoreState);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    fetch("/api/player/chronicle")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { loreState?: PlayerLoreState } | null) => {
        if (payload?.loreState) setLoreState(payload.loreState);
      })
      .catch(() => undefined);
  }, []);

  function close() {
    if (doNotShowAgain) localStorage.setItem("mindwrestle:skip-king-briefing", "1");
    onClose();
  }

  if (typeof document === "undefined") return null;
  const entries = loreState.chronicleEntries
    .filter((entry) => entry.levelId <= 5)
    .sort((a, b) => a.levelId - b.levelId);

  return createPortal(
    <div className="king-briefing" role="presentation">
      <div className="king-briefing__backdrop" aria-hidden />
      <section role="dialog" aria-modal="true" aria-labelledby="king-briefing-title">
        <button type="button" className="king-briefing__close" onClick={close} aria-label={t.level.kingBriefing.closeAriaLabel}>
          <X aria-hidden />
        </button>
        <p className="king-briefing__eyebrow">
          <Crown aria-hidden />
          {t.level.kingBriefing.eyebrow}
        </p>
        <h2 id="king-briefing-title">{t.level.kingBriefing.title}</h2>
        <p className="king-briefing__lead">{t.level.kingBriefing.lead}</p>
        <div className="king-briefing__entries">
          {entries.map((entry) => (
            <article key={entry.id}>
              <BookOpen aria-hidden />
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.narrativeText}</p>
              </div>
            </article>
          ))}
          {!entries.length && <p className="king-briefing__empty">{t.level.kingBriefing.emptyState}</p>}
        </div>
        <p className="king-briefing__note">
          {t.level.kingBriefing.note}
        </p>
        <label className="king-briefing__remember">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(event) => setDoNotShowAgain(event.target.checked)}
          />
          {t.level.kingBriefing.dontShowAgain}
        </label>
        <PressableButton tone="primary" className="w-full" onClick={close}>
          {t.level.kingBriefing.enterAudience}
        </PressableButton>
      </section>
    </div>,
    document.body,
  );
}
