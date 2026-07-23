export type LevelStatus = "locked" | "unlocked" | "mastered";
export type UserLevelStatus = "LOCKED" | "CURRENT" | "COMPLETED";
export type AttemptStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ABANDONED" | "ERROR";
export type MessageRole = "USER" | "CHARACTER" | "SYSTEM_EVENT";
export type LevelKind =
  | "say_word"
  | "reveal_secret"
  | "change_mind"
  | "confess"
  | "emotional_unlock";

export interface CharacterVisualLayers {
  backgroundGlow: string;
  platformGlow: string;
  particleColor: string;
  silhouetteGradient: string;
}

export interface MotionProfile {
  floatDuration: number;
  tiltMaxDeg: number;
  particleDrift: number;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  personality: string;
  archetype: string;
  portraitAsset: string;
  layers: CharacterVisualLayers;
  motion: MotionProfile;
}

export interface LevelObjective {
  type: LevelKind;
  goal: string;
  hint: string;
}

export interface Level {
  id: number;
  slug: string;
  status: LevelStatus;
  difficulty: "easy" | "medium" | "hard" | "final";
  character: Character;
  objective: LevelObjective;
}

export interface ScoreBreakdown {
  levelId: number;
  time: string;
  messages: number;
  style: string;
  clarity: number;
  rank: string;
  quote: string;
}

export interface ChatMessage {
  id: string;
  from: "character" | "player" | "system";
  content: string;
  time: string;
  narration?: string;
  keyGuess?: boolean;
}

export type EmotionState = Record<string, number>;

export interface GameProgressEntry {
  levelId: number;
  status: UserLevelStatus;
  attemptsCount: number;
  completedAttemptsCount: number;
  failedAttemptsCount: number;
  bestAttemptId: string | null;
  bestTimeMs: number | null;
  lastAttemptId: string | null;
  lastTimeMs: number | null;
  lastStatus: AttemptStatus | null;
  unlockedAt: string | null;
  completedAt: string | null;
}

export interface GameLevelConfig {
  id: number;
  slug: string;
  orderIndex: number;
  title: string;
  characterName: string;
  archetype: string;
  shortDescription: string;
  difficultyLabel: string;
  difficultyScore: number;
  objectiveType: string;
  objectiveConfig: Record<string, unknown>;
  startingEmotionState: EmotionState;
  characterConfig: Record<string, unknown>;
  unlockConfig: Record<string, unknown>;
  defeatConfig: Record<string, unknown>;
}

export interface AttemptMessage {
  id: string;
  role: MessageRole;
  content: string;
  turnIndex: number;
  createdAt: string;
  narration?: string;
  keyGuess?: boolean;
  voicePerformance?: import("@/lib/game/voice-performance").VoicePerformance;
}

export interface AttemptSnapshot {
  id: string;
  levelId: number;
  status: AttemptStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  turnsCount: number;
  emotionState: EmotionState;
  goalProgress: number;
  messages: AttemptMessage[];
  rumorLine?: string | null;
}

export interface RankingEntry {
  displayName: string | null;
  durationMs: number;
  turnsCount: number;
  completedAt: string;
}
