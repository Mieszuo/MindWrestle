import type { VoiceDirection } from "@/lib/game/voice-performance";

export interface VoiceProfile {
  levelId: number;
  label: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  speed: number;
  style: number;
  voiceDirection: VoiceDirection;
}

const DEFAULT_MODEL = "eleven_v3";

/** Baseline delivery per character — overridden by deriveVoiceDelivery() at runtime. */
const BASE_PROFILES: Record<number, Omit<VoiceProfile, "voiceId" | "modelId">> = {
  1: { levelId: 1, label: "Mila", stability: 0.68, similarityBoost: 0.76, speed: 0.97, style: 0.22, voiceDirection: "softly" },
  2: { levelId: 2, label: "Handlarz", stability: 0.64, similarityBoost: 0.74, speed: 1.0, style: 0.28, voiceDirection: "amused" },
  3: { levelId: 3, label: "Rycerz", stability: 0.69, similarityBoost: 0.78, speed: 0.97, style: 0.22, voiceDirection: "solemnly" },
  4: { levelId: 4, label: "Ork", stability: 0.64, similarityBoost: 0.74, speed: 0.92, style: 0.3, voiceDirection: "firmly" },
  5: { levelId: 5, label: "Mędrzec", stability: 0.72, similarityBoost: 0.78, speed: 0.94, style: 0.18, voiceDirection: "thoughtfully" },
  6: { levelId: 6, label: "Król", stability: 0.7, similarityBoost: 0.8, speed: 0.95, style: 0.24, voiceDirection: "authoritatively" },
  7: { levelId: 7, label: "Bóg", stability: 0.74, similarityBoost: 0.82, speed: 0.9, style: 0.16, voiceDirection: "distantly" },
};

export function getBaseVoiceDirection(levelId: number): VoiceDirection {
  return (BASE_PROFILES[levelId] ?? BASE_PROFILES[1]!).voiceDirection;
}

function resolveVoiceId(levelId: number): string | null {
  const specific = process.env[`ELEVENLABS_VOICE_${levelId}`]?.trim();
  if (specific) return specific;
  const fallback = process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim();
  return fallback || null;
}

export function hasElevenLabsConfig() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim());
}

export function getVoiceProfile(levelId: number): VoiceProfile | null {
  const voiceId = resolveVoiceId(levelId);
  if (!voiceId || !process.env.ELEVENLABS_API_KEY?.trim()) return null;

  const base = BASE_PROFILES[levelId] ?? BASE_PROFILES[1]!;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL;

  return {
    ...base,
    levelId,
    voiceId,
    modelId,
  };
}

export const TTS_MAX_CHARACTERS = 800;
