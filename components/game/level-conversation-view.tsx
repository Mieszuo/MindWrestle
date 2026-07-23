"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { CoachingWhisper } from "@/components/game/coaching-whisper";
import { LevelParchmentEntrance } from "@/components/game/level-parchment-entrance";
import { LevelScene } from "@/components/game/level-scene";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { useCoachingHints } from "@/hooks/use-coaching-hints";
import type { MusicTrack } from "@/lib/audio/audio-types";
import type { ConversationStatSnapshot } from "@/lib/game/coaching-hints";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { AttemptSnapshot, Character, LevelObjective } from "@/lib/game/types";

const ConversationParchment = dynamic(
  () => import("@/components/game/conversation-parchment").then((m) => ({ default: m.ConversationParchment })),
  { ssr: false },
);

interface LevelConversationViewProps {
  sceneSrc?: string;
  musicTrack: MusicTrack;
  levelId: number;
  character: Character;
  objective: LevelObjective;
  totalLevels?: number;
}

export function LevelConversationView({ sceneSrc, musicTrack, levelId, character, objective, totalLevels }: LevelConversationViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const backHandlerRef = useRef<(() => void) | null>(null);
  const [attempt, setAttempt] = useState<AttemptSnapshot | null>(null);
  const [reactionTags, setReactionTags] = useState<string[]>([]);
  const [stats, setStats] = useState<ConversationStatSnapshot[]>([]);
  const [responseMode, setResponseMode] = useState<ResponseMode | undefined>(undefined);
  const [attemptJustStarted, setAttemptJustStarted] = useState(false);

  const handleAttemptUpdate = useCallback(
    (payload: {
      attempt: AttemptSnapshot;
      reactionTags: string[];
      stats: ConversationStatSnapshot[];
      responseMode?: ResponseMode;
      attemptJustStarted?: boolean;
    }) => {
      setAttempt(payload.attempt);
      setReactionTags(payload.reactionTags);
      setStats(payload.stats);
      setResponseMode(payload.responseMode);
      setAttemptJustStarted(payload.attemptJustStarted ?? false);
    },
    [],
  );

  const { activeHint, history, dismiss } = useCoachingHints({
    levelId,
    character,
    objective,
    attempt,
    reactionTags,
    stats,
    responseMode,
    attemptJustStarted,
    locale,
  });

  return (
    <LevelScene
      backdropSrc={sceneSrc}
      backLabel={t.common.mapButton}
      onBackClick={() => {
        if (backHandlerRef.current) backHandlerRef.current();
        else router.push("/levels");
      }}
    >
      <CoachingWhisper hint={activeHint} onDismiss={dismiss} />
      <div className="level-scene__parchment">
        <LevelParchmentEntrance>
          <ConversationParchment
            character={character}
            objective={objective}
            messages={[]}
            musicTrack={musicTrack}
            levelId={levelId}
            totalLevels={totalLevels}
            stats={[]}
            coachingHints={history}
            backHandlerRef={backHandlerRef}
            onAttemptUpdate={handleAttemptUpdate}
            onMessageSent={dismiss}
          />
        </LevelParchmentEntrance>
      </div>
    </LevelScene>
  );
}
