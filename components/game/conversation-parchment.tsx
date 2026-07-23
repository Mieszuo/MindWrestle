"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BookOpen, Feather, Scroll } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";

import { AttemptPurchaseModal } from "@/components/billing/attempt-purchase-modal";
import { CharacterCardModal } from "@/components/game/character-card-modal";
import { ChroniclePanel } from "@/components/game/chronicle-panel";
import { DefeatModal, type DefeatSummary } from "@/components/game/defeat-modal";
import { EndingSlides } from "@/components/game/ending-slides";
import { KingBriefingPanel } from "@/components/game/king-briefing-panel";
import { SageKeyGuessPanel } from "@/components/game/sage-key-guess-panel";
import { StoryBeatScreen } from "@/components/game/story-beat-screen";
import { VictoryModal, type VictorySummary } from "@/components/game/victory-modal";
import { VoiceInputButton } from "@/components/game/voice-input-button";
import { PressableButton } from "@/components/ui/pressable-button";
import { useAudio } from "@/hooks/use-audio";
import { useCharacterVoice } from "@/hooks/use-character-voice";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

const PendingActionModal = dynamic(
  () => import("@/components/game/PendingActionModal").then((m) => ({ default: m.PendingActionModal })),
);
const DiceRollerOverlay = dynamic(
  () => import("@/components/game/DiceRollerOverlay").then((m) => ({ default: m.DiceRollerOverlay })),
);
import type { MusicTrack } from "@/lib/audio/audio-types";
import type { DefeatReason } from "@/lib/game/defeat";
import { getCharacterCard } from "@/lib/game/character-card";
import { getEmotionMoodDisplay } from "@/lib/game/emotion-display";
import { inferCharacterReaction } from "@/lib/game/character-reactions";
import type { EmotionMoodTone } from "@/lib/game/level-emotions";
import { getLevelEmotionLabels, statsFromLevelEmotion } from "@/lib/game/level-emotions";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { AttemptScore } from "@/lib/game/attempt-scoring";
import { NEGATIVE_REPUTATION_INCIDENT_TAGS } from "@/lib/game/reputation-triggers";
import { getLevelRedLines } from "@/lib/game/resistance-triggers";
import { getLevelSceneMusicTrack } from "@/lib/game/level-scenes";
import { isSageKeyGuessLevel } from "@/lib/game/sage-level";
import type { LoreBeatPayload } from "@/lib/game/lore/lore-beat-payload";
import type { PlayerLoreState } from "@/lib/game/lore/player-lore-state";
import type { PlayerReputation } from "@/lib/game/reputation";
import type { CoachingHint, ConversationStatSnapshot } from "@/lib/game/coaching-hints";
import { AttemptSnapshot, ChatMessage, Character, LevelObjective } from "@/lib/game/types";
import { getThinkingPhrase } from "@/lib/game/thinking-phrases";
import { splitSpeechSentences } from "@/lib/voice/speech-chunks";
import { cn } from "@/lib/utils";

interface ConversationStat {
  key: string;
  label: string;
  value: number;
  tone: EmotionMoodTone;
}

interface ConversationParchmentProps {
  character: Character;
  objective: LevelObjective;
  messages: ChatMessage[];
  musicTrack: MusicTrack;
  stats: ConversationStat[];
  coachingHints?: CoachingHint[];
  levelId: number;
  totalLevels?: number;
  backHandlerRef?: MutableRefObject<(() => void) | null>;
  onAttemptUpdate?: (payload: {
    attempt: AttemptSnapshot;
    reactionTags: string[];
    stats: ConversationStatSnapshot[];
    responseMode?: ResponseMode;
    attemptJustStarted?: boolean;
  }) => void;
  onMessageSent?: () => void;
}

function shortName(name: string) {
  return name.split(" ").at(-1) ?? name;
}

const inkEase = [0.22, 1, 0.36, 1] as const;
const mistEase = [0.16, 1, 0.3, 1] as const;
const MAX_MESSAGE_LENGTH = 500;

function gameErrorMessage(error: unknown, t: Messages) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  // NOTE: "długiego argumentu" matches the (still-untranslated) Polish string
  // thrown by lib/game/engine.server.ts — this is a backend-message signal,
  // not display copy, so it stays Polish until that file is translated.
  if (lower.includes("500") || lower.includes("exceed") || lower.includes("długiego argumentu")) {
    return t.level.conversation.errors.messageTooLong(MAX_MESSAGE_LENGTH);
  }

  if (lower.includes("content is required") || lower.includes("required")) {
    return t.level.conversation.errors.contentRequired;
  }

  if (lower.includes("not in progress") || lower.includes("session finished")) {
    return t.level.conversation.errors.notInProgress;
  }

  if (lower.includes("not found")) {
    return t.level.conversation.errors.notFound;
  }

  if (lower.includes("locked")) {
    return t.level.conversation.errors.locked;
  }

  if (lower.includes("unauthorized")) {
    return t.level.conversation.errors.unauthorized;
  }

  return t.level.conversation.errors.generic;
}

function fogMotionProps(from: ChatMessage["from"], reduceMotion: boolean | null) {
  if (reduceMotion) return {};

  if (from === "character") {
    return {
      initial: { opacity: 0.35, y: 6, filter: "blur(6px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 0.72, ease: mistEase },
    };
  }

  if (from === "player") {
    return {
      initial: { opacity: 0.4, y: 4, filter: "blur(5px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 0.62, ease: mistEase },
    };
  }

  return {
    initial: { opacity: 0.38, y: 5, filter: "blur(5px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.68, ease: mistEase },
  };
}

function thinkingFogMotionProps(reduceMotion: boolean | null) {
  if (reduceMotion) return {};

  return {
    initial: { opacity: 0.4, y: 5, filter: "blur(5px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(4px)" },
    transition: { duration: 0.58, ease: mistEase },
  };
}

const inkReveal = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: inkEase },
  },
};

const bodyReveal = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.18 },
  },
};

export function ConversationParchment({
  character,
  objective,
  messages,
  musicTrack,
  coachingHints = [],
  levelId,
  totalLevels = 7,
  backHandlerRef,
  onAttemptUpdate,
  onMessageSent,
}: ConversationParchmentProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const audio = useAudio();
  const { crossfadeTo, unlockAudio, sttAutoSend } = audio;
  const { speakCharacter, cancelSpeech } = useCharacterVoice();
  const [cardOpen, setCardOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [kingBriefingOpen, setKingBriefingOpen] = useState(
    () =>
      levelId === 6 &&
      (typeof window === "undefined" || localStorage.getItem("mindwrestle:skip-king-briefing") !== "1"),
  );
  const [attempt, setAttempt] = useState<AttemptSnapshot | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [spokenMessageText, setSpokenMessageText] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingCharacterReply, setAwaitingCharacterReply] = useState(false);
  const [victorySummary, setVictorySummary] = useState<VictorySummary | null>(null);
  const [loreBeat, setLoreBeat] = useState<LoreBeatPayload | null>(null);
  const [endingLoreState, setEndingLoreState] = useState<PlayerLoreState | null>(null);
  const [endingReputation, setEndingReputation] = useState<PlayerReputation | null>(null);
  const [endingDisplayName, setEndingDisplayName] = useState<string | null>(null);
  const [completionSpeechPending, setCompletionSpeechPending] = useState(false);
  const [defeatReason, setDefeatReason] = useState<DefeatReason | null>(null);
  const [defeatSummary, setDefeatSummary] = useState<DefeatSummary | null>(null);
  const [defeatSpeechPending, setDefeatSpeechPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [attemptShopOpen, setAttemptShopOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [diceResult, setDiceResult] = useState<any>(null);
  const reduceMotion = useReducedMotion();
  const card = getCharacterCard(character, objective, levelId, locale);
  const spokenName = shortName(character.name);
  const inProgress = attempt?.status === "IN_PROGRESS";
  const completed = attempt?.status === "COMPLETED";
  const failed = attempt?.status === "FAILED" || attempt?.status === "ABANDONED";
  const emotionDefeated = failed && defeatReason !== null;
  const currentStats = useMemo(() => {
    const stats = statsFromLevelEmotion(levelId, attempt?.emotionState ?? null);
    const localizedLabels = getLevelEmotionLabels(levelId, locale);
    return stats.map((stat, i) => ({ ...stat, label: localizedLabels[i] ?? stat.label }));
  }, [attempt, levelId, locale]);
  const thinkingPhrase = useMemo(
    () => (awaitingCharacterReply ? getThinkingPhrase(levelId, character.name, locale) : null),
    [awaitingCharacterReply, levelId, character.name, locale],
  );
  const hasCharacterReply = useMemo(
    () => localMessages.some((message) => message.from === "character"),
    [localMessages],
  );
  const [pulsingStats, setPulsingStats] = useState<Record<string, boolean>>({});
  const prevStatsRef = useRef<ConversationStat[]>(currentStats);
  const announcedStatusRef = useRef<string | null>(null);
  const chronicleEndRef = useRef<HTMLDivElement>(null);
  const elapsedMs = attempt ? (attempt.durationMs ?? Math.max(0, now - new Date(attempt.startedAt).getTime())) : 0;

  const scrollChronicleToEnd = useCallback(() => {
    chronicleEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [reduceMotion]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollChronicleToEnd());
    return () => cancelAnimationFrame(frame);
  }, [localMessages, awaitingCharacterReply, completed, scrollChronicleToEnd]);

  const BodyTag = reduceMotion ? "div" : motion.div;
  const HeroTag = reduceMotion ? "header" : motion.header;
  const SectionTag = reduceMotion ? "section" : motion.section;
  const FooterTag = reduceMotion ? "footer" : motion.footer;

  const motionProps = reduceMotion ? {} : { variants: inkReveal };

  const requestExit = useCallback(() => {
    if (inProgress) setExitOpen(true);
    else router.push("/levels");
  }, [inProgress, router]);

  useEffect(() => {
    if (!backHandlerRef) return;
    backHandlerRef.current = requestExit;
    return () => {
      backHandlerRef.current = null;
    };
  }, [backHandlerRef, requestExit]);

  useEffect(() => {
    unlockAudio();
    crossfadeTo(musicTrack);
  }, [crossfadeTo, unlockAudio, musicTrack]);

  useEffect(() => {
    if (!inProgress) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [inProgress]);

  useEffect(() => {
    if (!inProgress || !attempt) return;
    const interval = window.setInterval(() => {
      void fetch(`/api/game/attempts/${attempt.id}/heartbeat`, { method: "POST" });
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [attempt, inProgress]);

  useEffect(() => {
    if (!inProgress) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [inProgress]);

  useEffect(() => {
    const prev = prevStatsRef.current;
    const changed: Record<string, boolean> = {};
    currentStats.forEach((stat) => {
      const before = prev.find((entry) => entry.key === stat.key);
      if (before && before.value !== stat.value) {
        changed[stat.key] = true;
      }
    });
    prevStatsRef.current = currentStats;

    if (Object.keys(changed).length === 0) return;
    setPulsingStats((current) => ({ ...current, ...changed }));
    const timer = window.setTimeout(() => {
      setPulsingStats((current) => {
        const next = { ...current };
        Object.keys(changed).forEach((key) => delete next[key]);
        return next;
      });
    }, 720);
    return () => window.clearTimeout(timer);
  }, [currentStats]);

  const emitAttemptUpdate = useCallback(
    (
      nextAttempt: AttemptSnapshot,
      reactionTags: string[] = [],
      attemptJustStarted = false,
      responseMode?: ResponseMode,
    ) => {
      const stats = statsFromLevelEmotion(levelId, nextAttempt.emotionState ?? null);
      const localizedLabels = getLevelEmotionLabels(levelId, locale);
      onAttemptUpdate?.({
        attempt: nextAttempt,
        reactionTags,
        stats: stats.map((stat, i) => ({ ...stat, label: localizedLabels[i] ?? stat.label })),
        responseMode,
        attemptJustStarted,
      });
    },
    [levelId, locale, onAttemptUpdate],
  );

  const playLatestCharacterSpeech = useCallback(
    (
      snapshot: AttemptSnapshot,
      options?: {
        emotionDelta?: Record<string, number>;
        responseMode?: ResponseMode;
        onComplete?: () => void;
      },
    ) => {
      const lastCharacterMessage = [...snapshot.messages].reverse().find((message) => message.role === "CHARACTER");
      if (!lastCharacterMessage?.content) {
        options?.onComplete?.();
        return;
      }
      if (!audio.voiceEnabled) {
        setSpokenMessageText((current) => {
          const next = { ...current };
          delete next[lastCharacterMessage.id];
          return next;
        });
        options?.onComplete?.();
        return;
      }

      setSpokenMessageText((current) => ({ ...current, [lastCharacterMessage.id]: "" }));
      void speakCharacter({
        text: lastCharacterMessage.content,
        levelId,
        attemptId: snapshot.id,
        emotions: snapshot.emotionState,
        emotionDelta: options?.emotionDelta,
        responseMode: options?.responseMode,
        voicePerformance: lastCharacterMessage.voicePerformance,
        onSentenceStart: (revealedText) => {
          setSpokenMessageText((current) => ({
            ...current,
            [lastCharacterMessage.id]: revealedText,
          }));
        },
        onComplete: () => {
          setSpokenMessageText((current) => {
            const next = { ...current };
            delete next[lastCharacterMessage.id];
            return next;
          });
          options?.onComplete?.();
        },
      });
    },
    [audio.voiceEnabled, levelId, speakCharacter],
  );

  useEffect(() => () => cancelSpeech(), [cancelSpeech]);

  async function startConversation() {
    audio.unlockAudio();
    audio.playSfx("conversationStart");
    audio.crossfadeTo(musicTrack);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/levels/${levelId}/start`, { method: "POST" });
      const payload = (await response.json()) as { attempt?: AttemptSnapshot; error?: string };
      if (response.status === 402 && payload.error === "NO_ATTEMPTS_LEFT") {
        setAttemptShopOpen(true);
        return;
      }
      if (!response.ok || !payload.attempt) throw new Error(payload.error ?? t.level.conversation.errors.startFailed);
      setAttemptShopOpen(false);
      setAttempt(payload.attempt);
      setLocalMessages(payload.attempt.messages.map(toChatMessage));
      setVictorySummary(null);
      setLoreBeat(null);
      setEndingLoreState(null);
      setEndingReputation(null);
      setEndingDisplayName(null);
      setCompletionSpeechPending(false);
      setDefeatSpeechPending(false);
      setDefeatReason(null);
      setDefeatSummary(null);
      setGuessFeedback(null);
      setNow(Date.now());
      if (payload.attempt.messages.some((message) => message.role === "CHARACTER")) {
        audio.playSfx("messageReceive");
        playLatestCharacterSpeech(payload.attempt);
      }
      emitAttemptUpdate(payload.attempt, [], true);
    } catch (startError) {
      setError(gameErrorMessage(startError, t));
    } finally {
      setBusy(false);
    }
  }

  const submitContent = useCallback(
    async (content: string) => {
      if (!attempt || !content.trim() || busy || attempt.status !== "IN_PROGRESS") return;

      onMessageSent?.();

      const trimmed = content.trim();
      const optimisticId = `pending-user-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        from: "player",
        content: trimmed,
        time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      };

      setInput("");
      setLocalMessages((current) => [...current, optimisticMessage]);
      setAwaitingCharacterReply(true);
      setBusy(true);
      setError(null);
      cancelSpeech();
      audio.playSfx("messageSend");

      try {
        const response = await fetch(`/api/game/attempts/${attempt.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        const payload = (await response.json()) as {
          status?: string;
          pendingActionId?: string;
          actionTitle?: string;
          difficulty?: number;
          warning?: string;
          rejectionReason?: string;
          attempt?: AttemptSnapshot;
          emotionDelta?: Record<string, number>;
          durationMs?: number | null;
          rankingPosition?: number | null;
          isNewPersonalBest?: boolean;
          defeated?: boolean;
          defeatReason?: DefeatReason | null;
          reputationDelta?: { renown: number };
          reactionTags?: string[];
          attemptScore?: AttemptScore;
          responseMode?: ResponseMode;
          loreBeat?: LoreBeatPayload | null;
          error?: string;
        };

        if (payload.status === "REQUIRES_ACTION_CONFIRMATION") {
          setPendingAction(payload);
          setBusy(false);
          setAwaitingCharacterReply(false);
          return;
        }

        if (payload.status === "ACTION_REJECTED") {
          setLocalMessages((current) => current.filter((message) => message.id !== optimisticId));
          setError(payload.rejectionReason || t.level.conversation.errors.actionNotPossible);
          setBusy(false);
          setAwaitingCharacterReply(false);
          return;
        }

        if (!response.ok || !payload.attempt) throw new Error(payload.error ?? t.level.conversation.errors.sendFailed);
        setAttempt(payload.attempt);
        setLocalMessages(payload.attempt.messages.map(toChatMessage));
        audio.playSfx("messageReceive");
        const firstDiscoveryBeat =
          payload.attempt.status === "COMPLETED" && payload.loreBeat?.isFirstDiscovery
            ? payload.loreBeat
            : null;
        if (payload.attempt.status === "COMPLETED") {
          setCompletionSpeechPending(true);
        } else if (payload.defeated && payload.defeatReason) {
          setDefeatSpeechPending(true);
        }
        playLatestCharacterSpeech(payload.attempt, {
          emotionDelta: payload.emotionDelta,
          responseMode: payload.responseMode,
          onComplete: () => {
            if (payload.attempt?.status === "COMPLETED") {
              setCompletionSpeechPending(false);
              setLoreBeat(firstDiscoveryBeat);
            } else if (payload.attempt?.status === "FAILED" || payload.attempt?.status === "ABANDONED") {
              setDefeatSpeechPending(false);
            }
          },
        });
        if (payload.emotionDelta) {
          audio.playEmotionCue(payload.emotionDelta, payload.attempt.emotionState);
          const reaction = inferCharacterReaction(payload.emotionDelta, {
            completed: payload.attempt.status === "COMPLETED",
            defeated: payload.defeated,
          });
          if (reaction) audio.playCharacterReaction(character.id, reaction);
        }
        if (payload.attempt.status === "COMPLETED") {
          const lastCharacterMessage = [...payload.attempt.messages]
            .reverse()
            .find((message) => message.role === "CHARACTER");
          setVictorySummary({
            durationMs: payload.durationMs ?? payload.attempt.durationMs ?? 0,
            turnsCount: payload.attempt.turnsCount,
            rankingPosition: payload.rankingPosition ?? null,
            isNewPersonalBest: payload.isNewPersonalBest ?? false,
            renownDelta: payload.reputationDelta?.renown,
            quote: lastCharacterMessage?.content,
            attemptScore: payload.attemptScore,
            attemptId: payload.attempt.id,
            nextLevelId: levelId < totalLevels ? levelId + 1 : null,
          });
          if (announcedStatusRef.current !== "COMPLETED") {
            announcedStatusRef.current = "COMPLETED";
            audio.playSfx("victoryReveal");
          }
        } else if (payload.defeated && payload.defeatReason) {
          const negativeTag = payload.reactionTags?.find((tag) => NEGATIVE_REPUTATION_INCIDENT_TAGS.has(tag));
          const redLine = getLevelRedLines(levelId).find((line) => line.tag === negativeTag);
          setDefeatReason(payload.defeatReason);
          setDefeatSummary({
            durationMs: payload.durationMs ?? payload.attempt.durationMs ?? 0,
            turnsCount: payload.attempt.turnsCount,
            goalProgress: payload.attempt.goalProgress,
            renownDelta: payload.reputationDelta?.renown,
            resistanceLabel: (negativeTag ? t.content.resistanceTriggers[negativeTag]?.label : undefined) ?? redLine?.label,
            cardHint: card.hint,
          });
          if (announcedStatusRef.current !== "FAILED") {
            announcedStatusRef.current = "FAILED";
            audio.playSfx("attemptFailed");
          }
        }
        emitAttemptUpdate(payload.attempt, payload.reactionTags ?? [], false, payload.responseMode);
      } catch (sendError) {
        setLocalMessages((current) => current.filter((message) => message.id !== optimisticId));
        setInput(trimmed);
        setError(gameErrorMessage(sendError, t));
      } finally {
        setAwaitingCharacterReply(false);
        setBusy(false);
      }
    },
    [
      attempt,
      audio,
      busy,
      cancelSpeech,
      card.hint,
      character.id,
      emitAttemptUpdate,
      levelId,
      onMessageSent,
      playLatestCharacterSpeech,
    ],
  );

  const handleListeningStart = useCallback(() => {
    setInput("");
    setError(null);
  }, []);

  const handleLiveTranscript = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleUtteranceComplete = useCallback(
    (text: string) => {
      if (sttAutoSend) {
        void submitContent(text);
      }
    },
    [sttAutoSend, submitContent],
  );

  const voiceInput = useVoiceInput({
    attemptId: attempt?.id,
    levelId,
    disabled: busy || !inProgress || awaitingCharacterReply,
    onListeningStart: handleListeningStart,
    onLiveTranscript: handleLiveTranscript,
    onUtteranceComplete: handleUtteranceComplete,
  });

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitContent(input);
  }

  async function submitKeyGuess(guess: string) {
    if (!attempt || busy || attempt.status !== "IN_PROGRESS") return;

    setBusy(true);
    setGuessFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/game/attempts/${attempt.id}/key-guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });
      const payload = (await response.json()) as {
        attempt?: AttemptSnapshot;
        correct?: boolean;
        feedback?: string;
        defeated?: boolean;
        defeatReason?: DefeatReason | null;
        durationMs?: number | null;
        rankingPosition?: number | null;
        isNewPersonalBest?: boolean;
        attemptScore?: AttemptScore;
        reputationDelta?: { renown: number };
        loreBeat?: LoreBeatPayload | null;
        error?: string;
      };
      if (!response.ok || !payload.attempt) throw new Error(payload.error ?? t.level.conversation.errors.checkLocationFailed);

      setAttempt(payload.attempt);
      setLocalMessages(payload.attempt.messages.map(toChatMessage));

      if (payload.correct) {
        setGuessFeedback(t.level.conversation.guessCorrect);
        setTimeout(() => setGuessFeedback(null), 1500);
        const firstDiscoveryBeat = payload.loreBeat?.isFirstDiscovery ? payload.loreBeat : null;
        setCompletionSpeechPending(true);
        audio.playSfx("messageReceive");
        playLatestCharacterSpeech(payload.attempt, {
          onComplete: () => {
            setCompletionSpeechPending(false);
            setLoreBeat(firstDiscoveryBeat);
          },
        });
        setVictorySummary({
          durationMs: payload.durationMs ?? payload.attempt.durationMs ?? 0,
          turnsCount: payload.attempt.turnsCount,
          rankingPosition: payload.rankingPosition ?? null,
          isNewPersonalBest: payload.isNewPersonalBest ?? false,
          renownDelta: payload.reputationDelta?.renown,
          quote: guess,
          attemptScore: payload.attemptScore,
          attemptId: payload.attempt.id,
          nextLevelId: levelId < totalLevels ? levelId + 1 : null,
        });
        if (announcedStatusRef.current !== "COMPLETED") {
          announcedStatusRef.current = "COMPLETED";
          audio.playSfx("victoryReveal");
        }
        emitAttemptUpdate(payload.attempt);
      } else {
        if (payload.defeated && payload.defeatReason) {
          setDefeatReason(payload.defeatReason);
          setDefeatSummary({
            durationMs: payload.durationMs ?? payload.attempt.durationMs ?? 0,
            turnsCount: payload.attempt.turnsCount,
            goalProgress: payload.attempt.goalProgress,
            renownDelta: payload.reputationDelta?.renown,
            cardHint: card.hint,
          });
          if (announcedStatusRef.current !== "FAILED") {
            announcedStatusRef.current = "FAILED";
            audio.playSfx("attemptFailed");
          }
        }
        setGuessFeedback(
          payload.feedback ?? t.level.conversation.guessIncorrectDefault,
        );
        audio.playSfx("messageSend");
      }
    } catch (guessError) {
      setError(gameErrorMessage(guessError, t));
    } finally {
      setBusy(false);
    }
  }

  async function handleTryAgain() {
    setVictorySummary(null);
    setLoreBeat(null);
    setEndingLoreState(null);
    setEndingReputation(null);
    setEndingDisplayName(null);
    setCompletionSpeechPending(false);
    setDefeatSpeechPending(false);
    setDefeatReason(null);
    setDefeatSummary(null);
    setGuessFeedback(null);
    announcedStatusRef.current = null;
    await startConversation();
  }

  function handleNextLevel(nextLevelId: number) {
    audio.crossfadeTo(getLevelSceneMusicTrack(nextLevelId));
    router.push(`/level/${nextLevelId}`);
  }


  function handleReturnToMap() {
    audio.crossfadeTo("map");
    router.push("/levels");
  }

  async function confirmExit() {
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      router.push("/levels");
      return;
    }

    setBusy(true);
    try {
      audio.playSfx("attemptFailed");
      await fetch(`/api/game/attempts/${attempt.id}/forfeit`, { method: "POST" });
    } finally {
      router.push("/levels");
    }
  }

  async function continueAfterStoryBeat() {
    if (!loreBeat) return;
    setBusy(true);
    try {
      const seenResponse = await fetch("/api/player/chronicle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragmentId: loreBeat.fragmentId }),
      });
      if (levelId === 7) {
        const payload = (await seenResponse.json().catch(() => null)) as {
          loreState?: PlayerLoreState;
        } | null;
        if (payload?.loreState) setEndingLoreState(payload.loreState);
        const summaryResponse = await fetch("/api/player/summary");
        const summaryPayload = (await summaryResponse.json().catch(() => null)) as {
          reputation?: PlayerReputation;
          profile?: { displayName?: string | null };
        } | null;
        setEndingReputation(summaryPayload?.reputation ?? null);
        setEndingDisplayName(summaryPayload?.profile?.displayName ?? null);
      }
    } finally {
      setLoreBeat(null);
      setBusy(false);
    }
  }

  const showVictoryModal =
    completed &&
    victorySummary != null &&
    loreBeat == null &&
    endingLoreState == null &&
    !completionSpeechPending;
  const showDefeatModal = emotionDefeated && defeatReason != null && defeatSummary != null && !defeatSpeechPending;

  return (
    <>
      <article className={cn("parchment-ui", completed && "parchment-ui--victory", failed && "parchment-ui--defeat")}>
        {completed && (
          <div className="parchment-ui__victory-seal" aria-hidden>
            <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
              <path d="M14 24.5l7 7 13-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className="parchment-ui__aura" aria-hidden />
        <div className="parchment-ui__canvas" aria-hidden>
          <div className="parchment-ui__canvas-clip">
            <div className="parchment-ui__rotator">
              <Image
                src="/levels/pergamin.png"
                alt=""
                width={705}
                height={500}
                sizes="(max-width: 1024px) 90vw, 42vw"
                className="parchment-ui__art"
                priority
                draggable={false}
              />
            </div>
            <div className="parchment-ui__tone" />
            <div className="parchment-ui__candlelight" />
            <div className="parchment-ui__vignette" />
            <div className="parchment-ui__stain" />
            <div className="parchment-ui__grain" />
          </div>
        </div>

        <BodyTag
          className="parchment-ui__body dialog-text"
          {...(!reduceMotion && {
            variants: bodyReveal,
            initial: "hidden",
            animate: "visible",
          })}
        >
          <HeroTag className="parchment-ui__hero" {...motionProps}>
            <div className="parchment-ui__hero-top">
              <div className="parchment-ui__hero-left">
                {attempt && (
                  <span className="parchment-ui__timer" aria-label={t.level.conversation.timerAriaLabel(formatDuration(elapsedMs))}>
                    {formatDuration(elapsedMs)}
                  </span>
                )}
                {attempt && (
                  <span className="parchment-ui__turn-counter" aria-label={t.level.conversation.turnCountAriaLabel(attempt.turnsCount)}>
                    {attempt.turnsCount} {t.level.conversation.turnWord(attempt.turnsCount)}
                  </span>
                )}
              </div>
              <p className="parchment-ui__eyebrow">{t.level.conversation.conversingWith}</p>
              <div className="parchment-ui__hero-actions">
                <button
                  type="button"
                  className="parchment-ui__card-btn"
                  aria-label={t.level.conversation.openChronicleAriaLabel}
                  onClick={() => setChronicleOpen(true)}
                >
                  <Scroll style={{ width: '2.4cqi', height: '2.4cqi' }} aria-hidden />
                  {t.level.conversation.chronicleButton}
                </button>
                <button
                  type="button"
                  className="parchment-ui__card-btn"
                  aria-label={t.level.conversation.openCharacterCardAriaLabel}
                  onClick={() => setCardOpen(true)}
                >
                  <BookOpen style={{ width: '2.4cqi', height: '2.4cqi' }} aria-hidden />
                  {t.level.conversation.cardButton}
                </button>
              </div>
            </div>
            <h2 className="parchment-ui__name">{character.name}</h2>
            <p className="parchment-ui__title">{character.title}</p>
            <p className="parchment-ui__personality">{character.personality}</p>
          </HeroTag>

          <InkRule fine={false} reduceMotion={reduceMotion} />

          <SectionTag className="parchment-ui__section parchment-ui__section--goal" {...motionProps}>
            <p className="parchment-ui__eyebrow">{t.level.conversation.goalLabel}</p>
            <p className="parchment-ui__goal">{objective.goal}</p>
          </SectionTag>

          <InkRule fine={false} reduceMotion={reduceMotion} />

          <SectionTag className="parchment-ui__section parchment-ui__section--moods" {...motionProps}>
            <p className="parchment-ui__eyebrow">{t.level.conversation.moodsLabel}</p>
            <ul className="parchment-ui__moods">
              {currentStats.map((stat) => {
                const mood = getEmotionMoodDisplay(
                  levelId,
                  stat.key,
                  stat.tone,
                  stat.value,
                  locale,
                  !attempt || attempt.turnsCount === 0,
                );
                return (
                <li
                  key={stat.key}
                  className={cn(
                    "parchment-ui__mood",
                    mood.danger !== "comfortable" && `parchment-ui__mood--${mood.danger}`,
                  )}
                >
                  <div className="parchment-ui__mood-header">
                    <span className="parchment-ui__mood-label">{stat.label}</span>
                    <span className="parchment-ui__mood-value" aria-label={t.level.conversation.statValueAriaLabel(stat.label, stat.value)}>
                      {stat.value}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "parchment-ui__mood-ember",
                      `parchment-ui__mood-ember--${stat.tone}`,
                      mood.danger !== "comfortable" && `parchment-ui__mood-ember--danger-${mood.danger}`,
                      pulsingStats[stat.key] && "parchment-ui__mood-ember--pulse",
                    )}
                  >
                    <span style={{ width: `${stat.value}%` }} />
                  </span>
                  <em
                    className={cn(
                      "parchment-ui__mood-whisper",
                      mood.danger !== "comfortable" && `parchment-ui__mood-whisper--${mood.danger}`,
                    )}
                  >
                    {mood.whisper}
                  </em>
                </li>
                );
              })}
            </ul>
          </SectionTag>

          <InkRule fine={false} reduceMotion={reduceMotion} />

          <SectionTag className="parchment-ui__section parchment-ui__section--chronicle" {...motionProps}>
            <div className="parchment-ui__record-heading">
              <p className="parchment-ui__eyebrow">{t.level.conversation.conversationLogLabel}</p>
            </div>
            <div className="parchment-ui__chronicle">
              {attempt?.rumorLine && (
                <p className="parchment-ui__whisper-entry parchment-ui__whisper-entry--rumor">
                  <span className="parchment-ui__whisper-tag" title={t.level.conversation.rumorTooltip}>{t.level.conversation.rumorTag}</span>
                  {attempt.rumorLine}
                </p>
              )}
              {localMessages.length === 0 && !attempt?.rumorLine && (
                <p className="parchment-ui__whisper-entry">
                  <span className="parchment-ui__whisper-tag">{t.level.conversation.whisperTag}</span>
                  {attempt ? t.level.conversation.attemptStartedFirstWords : t.level.conversation.clickToStartHint}
                </p>
              )}
              {localMessages.length === 0 && attempt?.rumorLine && (
                <p className="parchment-ui__whisper-entry">
                  <span className="parchment-ui__whisper-tag">{t.level.conversation.whisperTag}</span>
                  {t.level.conversation.firstWordsOnly}
                </p>
              )}
              {localMessages.map((message, index) => (
                <MessageEntry
                  key={message.id}
                  message={message}
                  spokenName={spokenName}
                  index={index}
                  total={localMessages.length}
                  reduceMotion={reduceMotion}
                  spokenText={spokenMessageText[message.id]}
                />
              ))}

              {thinkingPhrase && (
                <ThinkingEntry phrase={thinkingPhrase} reduceMotion={reduceMotion} />
              )}
              <div ref={chronicleEndRef} className="parchment-ui__chronicle-anchor" aria-hidden />
            </div>
          </SectionTag>

          <FooterTag className="parchment-ui__scribe" {...motionProps}>
            {error && <p className="parchment-ui__whisper parchment-ui__whisper--scribe mb-2 text-center">{error}</p>}
            {voiceInput.error && (
              <p className="parchment-ui__whisper parchment-ui__whisper--scribe mb-2 text-center">{voiceInput.error}</p>
            )}
            {!attempt ? (
              <PressableButton tone="primary" className="w-full" onClick={startConversation} disabled={busy} sound="none">
                {busy ? t.level.conversation.preparingParchment : t.level.conversation.startAttempt}
              </PressableButton>
            ) : showVictoryModal || showDefeatModal ? null : (completed && !completionSpeechPending) ? null : (emotionDefeated && !defeatSpeechPending) ? null : failed ? (
              <div className="parchment-ui__defeat-footer space-y-2 text-center">
                <strong>{t.level.conversation.conversationEnded}</strong>
                <p className="text-sm opacity-80">{t.level.conversation.characterNotConvinced}</p>
                <PressableButton tone="secondary" className="w-full" onClick={() => router.push("/levels")}>
                  {t.level.conversation.returnToMap}
                </PressableButton>
              </div>
            ) : (
            <form className="parchment-ui__input" onSubmit={sendMessage}>
              <VoiceInputButton
                isListening={voiceInput.isListening}
                isConnecting={voiceInput.isConnecting}
                disabled={busy || !inProgress}
                hidden={!voiceInput.sttEnabled}
                onToggle={voiceInput.toggleListening}
              />
              <input
                type="text"
                placeholder={
                  voiceInput.isListening
                    ? t.level.conversation.listeningPlaceholder
                    : t.level.conversation.inputPlaceholder
                }
                className="parchment-ui__input-field"
                aria-label={t.level.conversation.yourResponseAriaLabel}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={!inProgress || voiceInput.isListening}
                style={{ caretColor: "#2a1608" }}
              />
              <PressableButton tone="wood" className="parchment-ui__input-send" aria-label={t.level.conversation.sendAriaLabel} disabled={busy || !input.trim() || !inProgress} sound="none">
                <Scroll className="h-4 w-4" aria-hidden />
              </PressableButton>
            </form>
            )}
          </FooterTag>
        </BodyTag>
      </article>

      {isSageKeyGuessLevel(levelId) && (
        <SageKeyGuessPanel
          levelId={levelId}
          attemptId={attempt?.id ?? null}
          inProgress={inProgress}
          hasCharacterReply={hasCharacterReply}
          busy={busy || awaitingCharacterReply}
          guessFeedback={guessFeedback}
          onSubmitGuess={submitKeyGuess}
        />
      )}

      {showVictoryModal && (
        <VictoryModal
          open
          characterName={character.name}
          summary={victorySummary}
          busy={busy}
          onReturnToMap={handleReturnToMap}
          onTryAgain={handleTryAgain}
          onNextLevel={victorySummary.nextLevelId ? handleNextLevel : undefined}
        />
      )}

      {loreBeat && (
        <StoryBeatScreen
          beat={loreBeat}
          character={character}
          busy={busy}
          onContinue={continueAfterStoryBeat}
        />
      )}

      {endingLoreState && (
        <EndingSlides
          loreState={endingLoreState}
          reputation={endingReputation}
          displayName={endingDisplayName}
          onFinish={() => {
            setEndingLoreState(null);
            handleReturnToMap();
          }}
        />
      )}

      {showDefeatModal && (
        <DefeatModal
          open
          levelId={levelId}
          characterName={character.name}
          defeatReason={defeatReason}
          summary={defeatSummary}
          busy={busy}
          onReturnToMap={handleReturnToMap}
          onTryAgain={handleTryAgain}
        />
      )}

      {typeof document !== "undefined" &&
        !!pendingAction &&
        createPortal(
          <PendingActionModal 
            isVisible={!!pendingAction} 
            actionTitle={pendingAction?.actionTitle || t.level.conversation.riskyActionDefaultTitle}
            warningText={pendingAction?.warning || t.level.conversation.riskyActionDefaultWarning}
            difficultyPreview={pendingAction?.difficulty || 15}
            onCancel={() => {
              setPendingAction(null);
              setLocalMessages((prev) => prev.slice(0, -1));
            }}
            onConfirm={async () => {
              const actionId = pendingAction.pendingActionId;
              setPendingAction(null);
              try {
                const res = await fetch('/api/game/risky-actions/confirm', {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pendingActionId: actionId })
                });
                const data = await res.json();
                if (data.success) {
                  setDiceResult(data);
                  setShowDiceOverlay(true);
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />,
          document.body,
        )}

      {typeof document !== "undefined" &&
        showDiceOverlay &&
        createPortal(
           <DiceRollerOverlay 
            isVisible={showDiceOverlay} 
            targetRoll={diceResult?.roll?.totalScore || 10}
            difficulty={diceResult?.roll?.difficulty || 15}
            outcome={diceResult?.roll?.outcome}
            onAnimationComplete={() => {
              setShowDiceOverlay(false);
              if (diceResult?.attempt) {
                setAttempt(diceResult.attempt);
                setLocalMessages(diceResult.attempt.messages.map(toChatMessage));
              }
              router.refresh();
            }}
          />,
          document.body,
        )}

      {typeof document !== "undefined" &&
        exitOpen &&
        createPortal(
          <div className="fixed inset-0 z-[90] grid place-items-center px-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 border-0 bg-black/55 backdrop-blur-[2px] cursor-pointer disabled:cursor-default"
              aria-label={t.level.conversation.stayInConversationAriaLabel}
              onClick={() => setExitOpen(false)}
              disabled={busy}
            />
            <section
              className="relative z-10 w-full max-w-sm rounded-2xl border border-amber-900/25 bg-[#f3dfb8] p-5 text-center text-amber-950 shadow-2xl dialog-text"
              role="dialog"
              aria-modal="true"
              aria-labelledby="conversation-exit-title"
            >
              <h3 id="conversation-exit-title" className="text-lg font-bold">
                {t.level.conversation.endAttemptTitle}
              </h3>
              <p className="mt-2 text-sm">
                {t.level.conversation.endAttemptWarning}
              </p>
              <div className="mt-4 flex gap-2">
                <PressableButton tone="secondary" className="flex-1" onClick={() => setExitOpen(false)} disabled={busy}>
                  {t.level.conversation.stay}
                </PressableButton>
                <PressableButton tone="primary" className="flex-1" onClick={confirmExit} disabled={busy} sound="none">
                  {t.level.conversation.endAttempt}
                </PressableButton>
              </div>
            </section>
          </div>,
          document.body,
        )}

      <CharacterCardModal
        character={character}
        card={card}
        open={cardOpen}
        onClose={() => setCardOpen(false)}
      />
      {attemptShopOpen && (
        <AttemptPurchaseModal
          levelId={levelId}
          title={t.level.conversation.outOfAttemptsTitle}
          description={t.level.conversation.outOfAttemptsDescription}
          onClose={() => setAttemptShopOpen(false)}
        />
      )}
      {chronicleOpen && <ChroniclePanel onClose={() => setChronicleOpen(false)} />}
      {kingBriefingOpen && <KingBriefingPanel onClose={() => setKingBriefingOpen(false)} />}
    </>
  );
}

function toChatMessage(message: AttemptSnapshot["messages"][number]): ChatMessage {
  return {
    id: message.id,
    from: message.role === "USER" ? "player" : message.role === "CHARACTER" ? "character" : "system",
    content: message.content,
    time: new Date(message.createdAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
    narration: message.narration,
    keyGuess: message.keyGuess,
  };
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MessageEntry({
  message,
  spokenName,
  index,
  total,
  reduceMotion,
  spokenText,
}: {
  message: ChatMessage;
  spokenName: string;
  index: number;
  total: number;
  reduceMotion: boolean | null;
  spokenText?: string;
}) {
  const t = useT();
  const EntryTag = reduceMotion ? "div" : motion.div;
  const entryTone =
    message.from === "character" ? "character" : message.from === "player" ? "player" : "system";
  const revealedSentences = spokenText === undefined ? null : splitSpeechSentences(spokenText);

  return (
    <EntryTag
      className={cn("parchment-ui__entry", `parchment-ui__entry--${entryTone}`)}
      {...fogMotionProps(message.from, reduceMotion)}
    >
      {!reduceMotion && <span className="parchment-ui__entry-mist" aria-hidden />}
      {message.from === "character" ? (
        <blockquote className="parchment-ui__voice">
          <span className="parchment-ui__voice-tag">{t.level.conversation.speaksTag(spokenName)}</span>
          <p aria-live="polite">
            {revealedSentences === null
              ? message.content
              : revealedSentences.length === 0
                ? t.level.conversation.takesABreath(spokenName)
                : revealedSentences.map((sentence, sentenceIndex) => (
                    <span
                      key={`${sentenceIndex}-${sentence}`}
                      className={cn(
                        "parchment-ui__spoken-sentence",
                        reduceMotion && "parchment-ui__spoken-sentence--static",
                      )}
                    >
                      {sentence}
                      {sentenceIndex < revealedSentences.length - 1 ? " " : ""}
                    </span>
                  ))}
          </p>
          {message.narration && <em className="parchment-ui__narration">{message.narration}</em>}
        </blockquote>
      ) : message.from === "player" ? (
        <div className="parchment-ui__verse">
          <span className="parchment-ui__verse-tag">
            <Feather className="parchment-ui__verse-icon" aria-hidden />
            {t.level.conversation.yourEntryTag}
          </span>
          <p>{message.content}</p>
        </div>
      ) : (
        <p className="parchment-ui__whisper-entry">
          <span className="parchment-ui__whisper-tag">
            {message.keyGuess ? t.level.conversation.stoneLocationGuessTag : t.level.conversation.whisperTag}
          </span>
          {message.content}
        </p>
      )}
      {index < total - 1 && <InkRule fine reduceMotion={reduceMotion} />}
    </EntryTag>
  );
}

function ThinkingEntry({ phrase, reduceMotion }: { phrase: string; reduceMotion: boolean | null }) {
  if (reduceMotion) {
    return (
      <p className="parchment-ui__thinking">
        <span className="parchment-ui__thinking-dots" aria-hidden>···</span>
        {phrase}
      </p>
    );
  }

  return (
    <motion.p
      className="parchment-ui__thinking parchment-ui__thinking--fog"
      {...thinkingFogMotionProps(reduceMotion)}
    >
      {!reduceMotion && <span className="parchment-ui__thinking-mist" aria-hidden />}
      <span className="parchment-ui__thinking-body">
        <span className="parchment-ui__thinking-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {phrase}
      </span>
    </motion.p>
  );
}

function InkRule({ fine = false, reduceMotion }: { fine?: boolean; reduceMotion: boolean | null }) {
  const className = cn("parchment-ui__ink-rule", fine && "parchment-ui__ink-rule--fine");

  if (reduceMotion) {
    return <div className={className} aria-hidden />;
  }

  return <motion.div className={className} aria-hidden variants={inkReveal} />;
}
