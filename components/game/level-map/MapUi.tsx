"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AttemptPurchaseModal } from "@/components/billing/attempt-purchase-modal";
import { ReputationBar } from "@/components/game/reputation-bar";
import { ChroniclePanel } from "@/components/game/chronicle-panel";
import { PressableButton } from "@/components/ui/pressable-button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Crown,
  Maximize,
  Minimize2,
  Music2,
  Plus,
  Settings,
  Trophy,
  UserRound,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAudio } from "@/hooks/use-audio";
import { useT } from "@/components/i18n/locale-provider";
import { MAP_FOG_EASE } from "@/lib/game/map-entrance";

const PlayerPanel = dynamic(
  () => import("@/components/game/player-panel").then((m) => ({ default: m.PlayerPanel })),
  { ssr: false },
);
import type { PlayerReputation } from "@/lib/game/reputation";
import type { LevelCompletion, LevelProgressEntry } from "@/lib/game/progress";
import type { LevelState } from "@/lib/game/mapScene";
import type { Level } from "@/lib/game/types";
import type { PlayerLoreState } from "@/lib/game/lore/player-lore-state";
import styles from "@/components/game/level-map/LevelMap.module.css";

interface AttemptEntitlementsView {
  paidRemaining: number;
  free: { limit: number; used: number; remaining: number };
}

const uiReveal = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

interface MapUiProps {
  completedCount: number;
  totalCount: number;
  levels: Level[];
  completions: LevelCompletion[];
  progressLevels: LevelProgressEntry[];
  selectedLevel: Level | null;
  selectedState: LevelState | null;
  selectedCompletion: LevelCompletion | null;
  reputation: PlayerReputation;
}

function LeaderboardModal({
  levels,
  initialLevelId,
  completions,
  onClose,
}: {
  levels: Level[];
  initialLevelId: number;
  completions: LevelCompletion[];
  onClose: () => void;
}) {
  const t = useT();
  const [levelId, setLevelId] = useState(initialLevelId);
  const [ranking, setRanking] = useState<{
    top: Array<{ displayName: string; duration: string; turnsCount: number }>;
    userBest: { duration: string; turnsCount: number; position: number } | null;
  } | null>(null);
  const level = levels.find((entry) => entry.id === levelId) ?? levels[0];
  const completion = completions.find((entry) => entry.levelId === level?.id) ?? null;

  useEffect(() => {
    if (!level?.id) return;
    fetch(`/api/game/levels/${level.id}/ranking`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setRanking(payload))
      .catch(() => setRanking(null));
  }, [level?.id]);

  return (
    <motion.div
      className={`${styles.leaderboardBackdrop} ${styles.uiFadeItem}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className={`${styles.leaderboardModal} ${styles.leaderboardRankingModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <PressableButton
          tone="icon"
          className={styles.leaderboardClose}
          onClick={onClose}
          aria-label={t.level.map.leaderboard.closeAriaLabel}
        >
          <X aria-hidden />
        </PressableButton>

        <div className={styles.leaderboardRankingHeader}>
          <div className={styles.leaderboardHeading}>
            <Crown aria-hidden />
            <p>{t.level.map.leaderboard.subheading}</p>
            <h2 id="leaderboard-title">{t.level.map.leaderboard.title}</h2>
          </div>

          <div className={styles.leaderboardLevelPicker} aria-label={t.level.map.leaderboard.pickCharacterAriaLabel}>
            {levels.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === level?.id ? styles.leaderboardLevelActive : ""}
                onClick={() => setLevelId(entry.id)}
                aria-pressed={entry.id === level?.id}
              >
                {entry.id}
              </button>
            ))}
          </div>

          <div className={styles.leaderboardCharacter}>
            <span>{t.level.map.levelLabel(level?.id ?? 0)}</span>
            <strong>{level?.character.name}</strong>
          </div>
        </div>

        <div className={styles.leaderboardTable}>
          <div className={styles.leaderboardTableHead}>
            <span>{t.level.map.leaderboard.table.rank}</span>
            <span>{t.level.map.leaderboard.table.player}</span>
            <span>{t.level.map.leaderboard.table.turns}</span>
            <span>{t.level.map.leaderboard.table.time}</span>
          </div>
          <div className={styles.leaderboardTableBody}>
            {ranking?.top.length ? (
              ranking.top.map((entry, index) => (
                <div className={styles.leaderboardTableRow} key={`${entry.displayName}-${index}`}>
                  <span>{index + 1}</span>
                  <span>{entry.displayName}</span>
                  <span>{entry.turnsCount}</span>
                  <span>{entry.duration}</span>
                </div>
              ))
            ) : (
              <div className={styles.leaderboardEmpty}>
                <Trophy aria-hidden />
                <strong>{t.level.map.leaderboard.emptyTitle}</strong>
                <span>{t.level.map.leaderboard.emptyBody}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.leaderboardPlayerRow}>
          <span>{t.level.map.leaderboard.yourPosition}</span>
          <strong>{ranking?.userBest?.position ?? "—"}</strong>
          <span>{t.level.map.leaderboard.yourRecord}</span>
          <strong>
            {ranking?.userBest
              ? t.level.map.leaderboard.recordSummary(ranking.userBest.turnsCount, ranking.userBest.duration)
              : (completion?.bestScore?.time ?? "—")}
          </strong>
        </div>
      </motion.section>
    </motion.div>
  );
}

function HudContent({
  levels,
  completions,
  selectedLevel,
  selectedState,
  selectedCompletion,
  reputation,
}: MapUiProps) {
  const t = useT();
  const router = useRouter();
  const audio = useAudio();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [loreState, setLoreState] = useState<PlayerLoreState | null>(null);
  const [attemptEntitlements, setAttemptEntitlements] = useState<AttemptEntitlementsView | null>(null);
  const [attemptShopOpen, setAttemptShopOpen] = useState(false);
  const [playerPanelOpen, setPlayerPanelOpen] = useState(false);
  const [playerPanelInitialTab, setPlayerPanelInitialTab] = useState<"profile" | "settings">("profile");
  const [dismissedDockNotices, setDismissedDockNotices] = useState<Set<string>>(() => new Set());
  const [closingDockNoticeKey, setClosingDockNoticeKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isCompleted = selectedState === "done";
  const isLocked = selectedLevel?.status === "locked";
  const selectedStatusLabel: Record<LevelState, string> = t.level.map.status;
  const statusLabel = selectedState ? selectedStatusLabel[selectedState] : null;
  const record = selectedCompletion?.bestScore?.time ?? "—";
  const initialLeaderboardLevelId = selectedLevel?.id ?? levels[0]?.id ?? 1;
  const selectedFragment = selectedLevel
    ? loreState?.chronicleEntries.find((entry) => entry.levelId === selectedLevel.id) ?? null
    : null;
  const clueForSelected = selectedLevel
    ? loreState?.chronicleEntries.find((entry) => entry.levelId + 1 === selectedLevel.id)?.clueText ?? null
    : null;
  const attemptsLabel = attemptEntitlements
    ? `${attemptEntitlements.paidRemaining + attemptEntitlements.free.remaining}`
    : "—";
  const selectedShopLevelId = selectedLevel?.id ?? 1;
  const dockNoticeCandidate = selectedLevel && !isLocked
    ? isCompleted
      ? {
          key: `completed:${selectedLevel.id}`,
          title: t.level.map.dock.noticeTitle,
          text: t.level.map.dock.completedNoticeText,
          icon: false,
        }
      : clueForSelected
        ? {
            key: `clue:${selectedLevel.id}:${clueForSelected}`,
            title: t.level.map.dock.chronicleClueTitle,
            text: clueForSelected,
            icon: true,
          }
        : null
    : null;
  const dockNotice = dockNoticeCandidate && !dismissedDockNotices.has(dockNoticeCandidate.key)
    ? dockNoticeCandidate
    : null;

  function dismissDockNotice(key: string) {
    if (closingDockNoticeKey === key) return;
    setClosingDockNoticeKey(key);
    window.setTimeout(() => {
      setDismissedDockNotices((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
      setClosingDockNoticeKey((current) => (current === key ? null : current));
    }, 240);
  }

  useEffect(() => {
    if (!dockNotice || closingDockNoticeKey === dockNotice.key) return;
    setClosingDockNoticeKey(null);
  }, [closingDockNoticeKey, dockNotice]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    fetch("/api/player/chronicle")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { loreState?: PlayerLoreState } | null) => {
        if (payload?.loreState) setLoreState(payload.loreState);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/billing/entitlements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { entitlements?: AttemptEntitlementsView } | null) => {
        if (payload?.entitlements) setAttemptEntitlements(payload.entitlements);
      })
      .catch(() => undefined);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      return;
    }
    void document.exitFullscreen();
  }

  return (
    <>
      <div className={styles.hudTop}>
        <Link href="/" className={`${styles.hudPlaque} ${styles.hudBack} ${styles.uiInteractive}`}>
          <ArrowLeft aria-hidden />
          <span>{t.level.map.menu}</span>
        </Link>

        <div className={`${styles.hudPlaque} ${styles.hudTitle} ${styles.hudRenown}`}>
          <ReputationBar reputation={reputation} variant="title" />
        </div>

        <div className={styles.hudRight}>
          <div className={`${styles.hudPlaque} ${styles.hudProgress} ${styles.uiInteractive}`}>
            <div>
              <span>{t.level.map.dock.attemptsLabel}</span>
              <strong>{attemptsLabel}</strong>
            </div>
            <button type="button" className={styles.hudBuyButton} onClick={() => setAttemptShopOpen(true)} aria-label={t.level.map.hud.buyAttemptsAriaLabel}>
              <Plus aria-hidden />
            </button>
          </div>
          <PressableButton
            tone="icon"
            className={`${styles.hudIconButton} ${styles.uiInteractive} ${audio.musicEnabled ? styles.hudIconButtonActive : ""}`}
            aria-label={audio.musicEnabled ? t.level.map.hud.disableMusicAriaLabel : t.level.map.hud.enableMusicAriaLabel}
            aria-pressed={audio.musicEnabled}
            onClick={() => audio.setMusicEnabled(!audio.musicEnabled)}
          >
            {audio.musicEnabled ? <Music2 aria-hidden /> : <VolumeX aria-hidden />}
          </PressableButton>
          <PressableButton
            tone="icon"
            className={`${styles.hudIconButton} ${styles.uiInteractive} ${isFullscreen ? styles.hudIconButtonActive : ""}`}
            aria-label={isFullscreen ? t.level.map.hud.exitFullscreenAriaLabel : t.level.map.hud.enterFullscreenAriaLabel}
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 aria-hidden /> : <Maximize aria-hidden />}
          </PressableButton>
          <PressableButton
            tone="icon"
            className={`${styles.hudIconButton} ${styles.uiInteractive} ${chronicleOpen ? styles.hudIconButtonActive : ""}`}
            aria-label={t.level.map.hud.openChronicleAriaLabel}
            aria-expanded={chronicleOpen}
            onClick={() => setChronicleOpen(true)}
          >
            <BookOpen aria-hidden />
          </PressableButton>
          <PressableButton
            tone="icon"
            className={`${styles.hudIconButton} ${styles.uiInteractive} ${playerPanelOpen ? styles.hudIconButtonActive : ""}`}
            aria-label={t.level.map.hud.playerPanelAriaLabel}
            aria-expanded={playerPanelOpen}
            onClick={() => {
              setPlayerPanelInitialTab("profile");
              setPlayerPanelOpen(true);
            }}
          >
            <UserRound aria-hidden />
          </PressableButton>
          <PressableButton
            tone="icon"
            className={`${styles.hudIconButton} ${styles.uiInteractive} ${playerPanelOpen ? styles.hudIconButtonActive : ""}`}
            aria-label={t.level.map.hud.settingsAriaLabel}
            aria-expanded={playerPanelOpen}
            onClick={() => {
              setPlayerPanelInitialTab("settings");
              setPlayerPanelOpen(true);
            }}
          >
            <Settings aria-hidden />
          </PressableButton>
        </div>
      </div>

      <motion.aside
        className={styles.mapDock}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.42, ease: "easeOut" }}
        aria-label={t.level.map.dock.panelAriaLabel}
      >
        {dockNotice && (
          <div className={styles.mapDockNoticeSlot}>
            <div
              className={`${styles.mapDockNotice} ${closingDockNoticeKey === dockNotice.key ? styles.mapDockNoticeClosing : ""}`}
              role="status"
            >
              <span className={styles.mapDockNoticeIcon}>{dockNotice.icon && <BookOpen aria-hidden />}</span>
              <span>
                <strong>{dockNotice.title}</strong>
                {dockNotice.text}
              </span>
              <button
                type="button"
                className={`${styles.mapDockNoticeClose} ${styles.uiInteractive}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dismissDockNotice(dockNotice.key);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dismissDockNotice(dockNotice.key);
                }}
                aria-label={t.level.map.dock.closeNoticeAriaLabel}
              >
                <X aria-hidden />
              </button>
            </div>
          </div>
        )}

        <div className={styles.mapDockCharacter}>
          {selectedLevel ? (
            <>
              <span className={styles.mapDockEyebrow}>
                {statusLabel ?? t.level.map.levelLabel(selectedLevel.id)}
              </span>
              <strong>
                {selectedLevel.character.name}
                {isCompleted && <em>{t.level.map.dock.convincedSuffix}</em>}
              </strong>
              <p>
                {isLocked
                  ? t.level.map.dock.availableAfterLevel(Math.max(1, selectedLevel.id - 1))
                  : selectedFragment
                    ? t.level.map.dock.chronicleFragmentLabel(selectedFragment.title)
                    : selectedLevel.character.title}
              </p>
            </>
          ) : (
            <>
              <span className={styles.mapDockEyebrow}>{t.level.map.dock.mapEyebrow}</span>
              <strong>{t.level.map.dock.chooseCharacterHeading}</strong>
              <p>{t.level.map.dock.chooseCharacterHint}</p>
            </>
          )}
        </div>

        <div className={styles.mapDockStats}>
          <div>
            <span>{t.level.map.dock.difficultyLabel}</span>
            <strong>{selectedLevel ? t.level.map.difficulty[selectedLevel.difficulty] : "—"}</strong>
          </div>
          <div>
            <span>{t.level.map.dock.attemptsLabel}</span>
            <strong>{attemptsLabel}</strong>
          </div>
          <div>
            <span>{isCompleted ? t.level.map.dock.yourRecordLabel : t.level.map.dock.recordLabel}</span>
            <strong>{record}</strong>
          </div>
        </div>

        <div className={`${styles.mapDockActions} ${styles.uiInteractive}`}>
          <PressableButton
            tone="secondary"
            className={styles.mapDockRanking}
            onClick={() => setLeaderboardOpen(true)}
          >
            <Trophy aria-hidden />
            <span>{selectedLevel ? t.level.map.dock.rankingButton : t.level.map.dock.leaderboardButton}</span>
          </PressableButton>

          {selectedLevel && !isLocked ? (
            <PressableButton
              tone="primary"
              className={`${styles.mapDockStart} flex-1`}
              onClick={() => {
                audio.unlockAudio();
                audio.playSfx("conversationStart");
                router.push(`/level/${selectedLevel.id}`);
              }}
              sound="none"
            >
              {isCompleted ? t.level.map.dock.playAgainButton : t.level.map.dock.startConversationButton}
            </PressableButton>
          ) : (
            <PressableButton tone="primary" className={`${styles.mapDockStart} flex-1`} disabled>
              {isLocked ? t.level.map.dock.lockedConversationButton : t.level.map.dock.startConversationButton}
            </PressableButton>
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {leaderboardOpen && (
          <LeaderboardModal
            levels={levels}
            initialLevelId={initialLeaderboardLevelId}
            completions={completions}
            onClose={() => setLeaderboardOpen(false)}
          />
        )}
        {chronicleOpen && <ChroniclePanel onClose={() => setChronicleOpen(false)} />}
        {attemptShopOpen && (
          <AttemptPurchaseModal levelId={selectedShopLevelId} onClose={() => setAttemptShopOpen(false)} />
        )}
        {playerPanelOpen && (
          <PlayerPanel initialTab={playerPanelInitialTab} onClose={() => setPlayerPanelOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

export function MapUi(props: MapUiProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className={styles.uiLayer}>
        <HudContent {...props} />
      </div>
    );
  }

  return (
    <div className={styles.uiLayer}>
      <motion.div
        className={styles.uiReveal}
        initial="hidden"
        animate="visible"
        variants={uiReveal}
        transition={{ delay: 0.75, duration: 0.65, ease: MAP_FOG_EASE }}
      >
        <HudContent {...props} />
      </motion.div>
    </div>
  );
}
