import { clamp } from "@/lib/game/emotions";
import { LEVEL_EMOTION_STATS } from "@/lib/game/level-emotions";
import { getEmotionBarDanger, type EmotionBarDanger } from "@/lib/game/defeat-thresholds";
import type { ResponseMode } from "@/lib/game/psychology/types";
import type { EmotionState } from "@/lib/game/types";

export interface VoiceDelivery {
  stability: number;
  similarityBoost: number;
  speed: number;
  style: number;
  moodDanger: EmotionBarDanger;
}

const DANGER_RANK: Record<EmotionBarDanger, number> = {
  comfortable: 0,
  uneasy: 1,
  critical: 2,
};

const DANGER_OFFSETS: Record<EmotionBarDanger, Partial<VoiceDelivery>> = {
  comfortable: {},
  uneasy: { stability: -0.05, style: 0.05, speed: 0.02 },
  critical: { stability: -0.12, style: 0.12, speed: 0.05 },
};

const RESPONSE_MODE_OFFSETS: Partial<Record<ResponseMode, Partial<VoiceDelivery>>> = {
  full_resistance: { stability: 0.04, speed: 0.02, style: -0.04 },
  defensive_deflection: { stability: 0.03, speed: 0.02 },
  crack_in_armor: { stability: -0.08, style: 0.07, speed: -0.01 },
  partial_concession: { stability: -0.04, style: 0.05, speed: -0.03 },
  full_reveal: { stability: -0.01, style: 0.03, speed: -0.02 },
};

const LEVEL_CRITICAL_STYLE: Partial<Record<number, Partial<VoiceDelivery>>> = {
  4: { style: 0.06, speed: 0.03 },
  6: { style: 0.05, speed: 0.02 },
};

function worstMoodDanger(levelId: number, emotions: EmotionState): EmotionBarDanger {
  const stats = LEVEL_EMOTION_STATS[levelId] ?? [];
  let worst: EmotionBarDanger = "comfortable";

  for (const stat of stats) {
    const value = emotions[stat.key];
    if (typeof value !== "number") continue;
    const danger = getEmotionBarDanger(levelId, stat.key, value);
    if (DANGER_RANK[danger] > DANGER_RANK[worst]) {
      worst = danger;
    }
  }

  return worst;
}

function clampDelivery(value: number, min: number, max: number) {
  return clamp(value, min, max);
}

export function deriveVoiceDelivery(
  levelId: number,
  base: Pick<VoiceDelivery, "stability" | "similarityBoost" | "speed" | "style">,
  emotions: EmotionState,
  options?: {
    emotionDelta?: Record<string, number>;
    responseMode?: ResponseMode;
  },
): VoiceDelivery {
  const moodDanger = worstMoodDanger(levelId, emotions);
  const dangerOffset = DANGER_OFFSETS[moodDanger];
  const modeOffset = options?.responseMode ? RESPONSE_MODE_OFFSETS[options.responseMode] : undefined;
  const levelOffset = moodDanger === "critical" ? LEVEL_CRITICAL_STYLE[levelId] : undefined;

  let stability = base.stability + (dangerOffset?.stability ?? 0) + (modeOffset?.stability ?? 0);
  let style = base.style + (dangerOffset?.style ?? 0) + (modeOffset?.style ?? 0) + (levelOffset?.style ?? 0);
  let speed = base.speed + (dangerOffset?.speed ?? 0) + (modeOffset?.speed ?? 0) + (levelOffset?.speed ?? 0);

  if (options?.emotionDelta) {
    const negativeTurn = Object.values(options.emotionDelta).reduce(
      (sum, value) => sum + (value < 0 ? value : 0),
      0,
    );
    if (negativeTurn <= -8) {
      stability -= 0.04;
      style += 0.04;
      speed += 0.01;
    }
  }

  return {
    stability: clampDelivery(stability, 0.30, 0.85),
    similarityBoost: clampDelivery(base.similarityBoost, 0.4, 1),
    speed: clampDelivery(speed, 0.75, 1.15),
    style: clampDelivery(style, 0.10, 0.70),
    moodDanger,
  };
}
