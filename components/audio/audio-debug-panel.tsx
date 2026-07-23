"use client";

import { useEffect, useMemo, useState } from "react";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";
import { useAudio } from "@/hooks/use-audio";
import { MUSIC_ASSETS, SFX_ASSETS } from "@/lib/audio/audio-assets";
import type { MusicTrack, SfxKey } from "@/lib/audio/audio-types";

type AssetStatus = "checking" | "found" | "missing";

const SFX_LABELS: Record<SfxKey, string> = {
  uiClickSoft: "UI soft",
  uiClickPrimary: "UI primary",
  uiLocked: "Locked",
  uiSelectLevel: "Select level",
  worldEnter: "World enter",
  conversationStart: "Conversation start",
  messageSend: "Message send",
  messageReceive: "Message receive",
  emotionTrustUpSoft: "Trust up",
  emotionSuspicionUpSoft: "Suspicion up",
  emotionPatienceWarning: "Patience warning",
  victoryReveal: "Victory",
  attemptFailed: "Failed",
  characterUnsure: "Character unsure",
  characterAnnoyed: "Character annoyed",
  characterInterested: "Character interested",
  characterBreakthrough: "Character breakthrough",
};

const MUSIC_LABELS: Record<MusicTrack, string> = {
  intro: "Intro",
  map: "Map loop",
  conversation: "Conversation loop",
  level1: "Level 1 forest",
  level2: "Level 2 trader",
  level3: "Level 3 knight",
  level4: "Level 4 ork",
  level5: "Level 5 sage",
  level6: "Level 6 king",
  level7: "Level 7 god",
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function checkAsset(src: string): Promise<AssetStatus> {
  try {
    const response = await fetch(src, { method: "HEAD", cache: "no-store" });
    return response.ok ? "found" : "missing";
  } catch {
    return "missing";
  }
}

export function AudioDebugPanel() {
  const t = useT();
  const audio = useAudio();
  const [assetStatus, setAssetStatus] = useState<Record<string, AssetStatus>>({});
  const musicEntries = useMemo(() => Object.entries(MUSIC_ASSETS) as Array<[MusicTrack, string]>, []);
  const sfxEntries = useMemo(() => Object.entries(SFX_ASSETS) as Array<[SfxKey, { src: string; volume: number }]>, []);

  function statusLabel(status: AssetStatus) {
    if (status === "found") return t.audioDebugPanel.statusOk;
    if (status === "missing") return t.audioDebugPanel.statusMissing;
    return t.audioDebugPanel.statusChecking;
  }

  useEffect(() => {
    let cancelled = false;
    const assets = [
      ...musicEntries.map(([key, src]) => [`music:${key}`, src] as const),
      ...sfxEntries.map(([key, asset]) => [`sfx:${key}`, asset.src] as const),
    ];

    void Promise.all(
      assets.map(async ([key, src]) => [key, await checkAsset(src)] as const),
    ).then((results) => {
      if (cancelled) return;
      setAssetStatus(Object.fromEntries(results));
    });

    return () => {
      cancelled = true;
    };
  }, [musicEntries, sfxEntries]);

  const missingCount = Object.values(assetStatus).filter((status) => status === "missing").length;

  return (
    <div className="mt-3 max-h-[min(60vh,520px)] w-full overflow-y-auto rounded-xl border border-amber-900/20 bg-amber-50/90 p-3 text-xs text-amber-950 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong className="block text-sm">{t.audioDebugPanel.title}</strong>
          <span className="opacity-75">
            {missingCount > 0 ? t.audioDebugPanel.missingAssets(missingCount) : t.audioDebugPanel.assetsChecked}
          </span>
        </div>
        <PressableButton tone="secondary" className="h-8 px-3 text-[0.68rem]" onClick={audio.resetAudioSettings}>
          {t.audioDebugPanel.resetButton}
        </PressableButton>
      </div>

      <div className="mt-3 grid gap-2">
        <label className="grid gap-1">
          <span className="font-semibold">{t.audioDebugPanel.volumeLabel(percent(audio.volume))}</span>
          <small className="leading-snug opacity-70">{t.audioDebugPanel.volumeHint}</small>
          <input type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(event) => audio.setVolume(Number(event.target.value))} />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex items-center justify-between gap-2 rounded-lg bg-amber-100/80 px-2 py-1.5">
          <span>{t.audioDebugPanel.musicToggle}</span>
          <input type="checkbox" checked={audio.musicEnabled} onChange={(event) => audio.setMusicEnabled(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-2 rounded-lg bg-amber-100/80 px-2 py-1.5">
          <span>{t.audioDebugPanel.sfxToggle}</span>
          <input type="checkbox" checked={audio.sfxEnabled} onChange={(event) => audio.setSfxEnabled(event.target.checked)} />
        </label>
      </div>

      <section className="mt-4">
        <strong className="block text-[0.72rem] uppercase tracking-[0.14em]">{t.audioDebugPanel.musicSectionTitle}</strong>
        <p className="mt-1 leading-snug opacity-70">{t.audioDebugPanel.musicSectionHint}</p>
        <div className="mt-2 grid gap-1.5">
          {musicEntries.map(([key, src]) => (
            <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg bg-white/55 px-2 py-1.5">
              <span className="min-w-0" title={src}>
                <span className="block truncate font-semibold">{MUSIC_LABELS[key]}</span>
                <span className="block truncate text-[0.65rem] opacity-70">{t.audioDebugPanel.musicDescriptions[key]}</span>
              </span>
              <span className={assetStatus[`music:${key}`] === "missing" ? "text-red-700" : "text-emerald-700"}>
                {statusLabel(assetStatus[`music:${key}`] ?? "checking")}
              </span>
              <PressableButton tone="secondary" className="h-7 px-2 text-[0.65rem]" onClick={() => { audio.unlockAudio(); audio.crossfadeTo(key, 1200); }} sound="none">
                {t.audioDebugPanel.testButton}
              </PressableButton>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <strong className="block text-[0.72rem] uppercase tracking-[0.14em]">{t.audioDebugPanel.sfxSectionTitle}</strong>
        <p className="mt-1 leading-snug opacity-70">{t.audioDebugPanel.sfxSectionHint}</p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {sfxEntries.map(([key, asset]) => (
            <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg bg-white/55 px-2 py-1.5">
              <span className="min-w-0" title={asset.src}>
                <span className="block truncate font-semibold">{SFX_LABELS[key]}</span>
                <span className="block truncate text-[0.65rem] opacity-70">{t.audioDebugPanel.sfxDescriptions[key]}</span>
              </span>
              <span className={assetStatus[`sfx:${key}`] === "missing" ? "text-red-700" : "text-emerald-700"}>
                {statusLabel(assetStatus[`sfx:${key}`] ?? "checking")}
              </span>
              <PressableButton tone="secondary" className="h-7 px-2 text-[0.65rem]" onClick={() => { audio.unlockAudio(); audio.playSfx(key); }} sound="none">
                {t.audioDebugPanel.playButton}
              </PressableButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
