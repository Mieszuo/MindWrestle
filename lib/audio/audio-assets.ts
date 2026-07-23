import type { MusicTrack, SfxKey } from "@/lib/audio/audio-types";

export const MUSIC_ASSETS: Record<MusicTrack, string> = {
  intro: "/audio/music/global/intro-the-first-page-opens.mp3",
  map: "/audio/music/global/map-loop.ogg",
  conversation: "/audio/music/global/conversation-base-loop.ogg",
  level1: "/audio/music/levels/01-mila/girl-magic-forest.wav",
  level2: "/audio/music/levels/02-trader/the-clever-merchant.mp3",
  level3: "/audio/music/levels/03-knight/the-noble-knight.mp3",
  level4: "/audio/music/levels/04-ork/orcs-stubborn-pride.mp3",
  level5: "/audio/music/levels/05-sage/the-sages-quiet-library.mp3",
  level6: "/audio/music/levels/06-king/the-kings-chamber.mp3",
  level7: "/audio/music/levels/07-god/god-fractures.wav",
};

export const SFX_ASSETS: Record<SfxKey, { src: string; volume: number; cooldownMs?: number }> = {
  uiClickSoft: { src: "/audio/ui/ui_click_soft.wav", volume: 0.35, cooldownMs: 80 },
  uiClickPrimary: { src: "/audio/ui/ui_click_primary.wav", volume: 0.42, cooldownMs: 120 },
  uiLocked: { src: "/audio/ui/ui_locked.wav", volume: 0.4, cooldownMs: 250 },
  uiSelectLevel: { src: "/audio/ui/ui_select_level.wav", volume: 0.4, cooldownMs: 160 },
  worldEnter: { src: "/audio/ui/world_enter.wav", volume: 0.48, cooldownMs: 800 },
  conversationStart: { src: "/audio/conversation/conversation_start.wav", volume: 0.46, cooldownMs: 800 },
  messageSend: { src: "/audio/conversation/message_send.wav", volume: 0.32, cooldownMs: 120 },
  messageReceive: { src: "/audio/conversation/message_receive.wav", volume: 0.34, cooldownMs: 250 },
  emotionTrustUpSoft: { src: "/audio/emotions/emotion_trust_up_soft.wav", volume: 0.34, cooldownMs: 4000 },
  emotionSuspicionUpSoft: { src: "/audio/emotions/emotion_suspicion_up_soft.wav", volume: 0.3, cooldownMs: 4000 },
  emotionPatienceWarning: { src: "/audio/emotions/emotion_patience_warning.wav", volume: 0.36, cooldownMs: 7000 },
  victoryReveal: { src: "/audio/conversation/victory_reveal.wav", volume: 0.48, cooldownMs: 1200 },
  attemptFailed: { src: "/audio/conversation/attempt_failed.wav", volume: 0.42, cooldownMs: 1200 },
  characterUnsure: { src: "/audio/characters/character_unsure.wav", volume: 0.28, cooldownMs: 5000 },
  characterAnnoyed: { src: "/audio/characters/character_annoyed.wav", volume: 0.3, cooldownMs: 5000 },
  characterInterested: { src: "/audio/characters/character_interested.wav", volume: 0.32, cooldownMs: 5000 },
  characterBreakthrough: { src: "/audio/characters/character_breakthrough.wav", volume: 0.38, cooldownMs: 4000 },
};

export const MUSIC_VOLUME_MULTIPLIER = 0.7;
export const SFX_VOLUME_MULTIPLIER = 1;
