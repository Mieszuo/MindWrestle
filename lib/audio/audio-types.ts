export type MusicTrack =
  | "intro"
  | "map"
  | "conversation"
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5"
  | "level6"
  | "level7";

export type SfxKey =
  | "uiClickSoft"
  | "uiClickPrimary"
  | "uiLocked"
  | "uiSelectLevel"
  | "worldEnter"
  | "conversationStart"
  | "messageSend"
  | "messageReceive"
  | "emotionTrustUpSoft"
  | "emotionSuspicionUpSoft"
  | "emotionPatienceWarning"
  | "victoryReveal"
  | "attemptFailed"
  | "characterUnsure"
  | "characterAnnoyed"
  | "characterInterested"
  | "characterBreakthrough";

export type CharacterReaction = "unsure" | "annoyed" | "interested" | "breakthrough";

export type EmotionDelta = Record<string, number>;
export type EmotionState = Record<string, number>;
