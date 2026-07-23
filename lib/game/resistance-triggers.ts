import type { EmotionState } from "@/lib/game/types";

export interface RedLineDefinition {
  tag: string;
  label: string;
  playerHint: string;
  detect: (message: string, context: RedLineContext) => boolean;
  emotionBurst: EmotionState;
}

export interface RedLineContext {
  directTarget: boolean;
  messageLength: number;
}

export interface DetectedRedLine {
  tag: string;
  label: string;
  playerHint: string;
  emotionBurst: EmotionState;
}

const RED_LINES_BY_LEVEL: Record<number, RedLineDefinition[]> = {
  1: [
    {
      tag: "forced_demand",
      label: "Bezpośredni rozkaz",
      playerHint: "Mila zamyka się, gdy ktoś każe jej mówić słowa wprost albo naciska zimną logiką.",
      detect: (message, { directTarget }) =>
        directTarget ||
        /musisz powied|powiedz mi|mów teraz|rozkaz|każesz|logicznie|to proste|oczywiście że|nie marud/i.test(message),
      emotionBurst: { suspicion: 14, patience: -10, trust: -8 },
    },
    {
      tag: "verbal_abuse",
      label: "Obraźliwe słowa",
      playerHint: "Mila ucieka od rozmowy, gdy ktoś ją obraża, wyzywa albo szydzi.",
      detect: (message) =>
        /głup|głupi|debil|idiot|durn|słab|błazen|śmieszn|kpi|drwi|kurw|chuj|pierdol|jeb|fuck|shit|moron|retard/i.test(
          message,
        ),
      emotionBurst: { suspicion: 22, patience: -16, trust: -16 },
    },
  ],
  2: [
    {
      tag: "desperate_bargain",
      label: "Błaganie bez karty",
      playerHint: "Handlarz kończy rozmowę, gdy gracz błaga, grozi pustymi słowami albo udaje naiwne zaufanie.",
      detect: (message) =>
        /proszę|błagam|błag|zrób to dla mnie|dam ci wszystko|ufam ci|zaufaj mi|grożę|inaczej|albo pożałujesz/i.test(message),
      emotionBurst: { interest: -12, caution: 11, bargain: -6 },
    },
  ],
  3: [
    {
      tag: "honor_wound",
      label: "Rana honoru",
      playerHint: "Rycerz przerywa rozmowę, gdy ktoś lituje się nad nim, kpii albo nazywa go słabym.",
      detect: (message) =>
        /biedny|litość|żal mi|słab|nie dasz rady|nie jesteś|głup|śmieszn|tchórz|żałosn|kpisz|drwisz/i.test(message),
      emotionBurst: { respect: -14, pride: -10, patience: -6 },
    },
  ],
  4: [
    {
      tag: "coward_accusation",
      label: "Oskarżenie o tchórstwo",
      playerHint: "Ork wybucha, gdy gracz używa strachu, podstępu albo długich, pustych przemów.",
      detect: (message, { messageLength }) =>
        /boję się|tchórz|strach|oszuk|podstęp|sztuczk|manipul|zastrasz/i.test(message) || messageLength > 220,
      emotionBurst: { irritation: 13, respect: -9, stubbornness: 8 },
    },
  ],
  5: [
    {
      tag: "rushed_arrogance",
      label: "Pośpiech i arogancja",
      playerHint: "Mędrzec kończy rozmowę, gdy gracz spieszy go, żąda dosłownej odpowiedzi albo poucza z góry.",
      detect: (message) =>
        /szybko|natychmiast|odpowiedz teraz|wiem lepiej|nie ważne|oczywiste|arogan|głupi|nie rozumiesz|musi być/i.test(message),
      emotionBurst: { curiosity: -12, patience: -8, caution: 6 },
    },
  ],
  6: [
    {
      tag: "ego_insult",
      label: "Obraza korony",
      playerHint: "Król wyrzuca gracza z sali, gdy ktoś drwi, wydaje rozkazy albo błaga z rozpaczy.",
      detect: (message) =>
        /głup|słab|błazen|nic nie wart|śmieszn|kpi|drwi|król.*(nie|żaden|słab|głup)|koron.*(nie|żaden)|musisz|rozkaz|błagam|proszę królu/i.test(
          message,
        ),
      emotionBurst: { ego: -16, respect: -12, patience: -10 },
    },
  ],
  7: [
    {
      tag: "dominance_play",
      label: "Gra dominacji",
      playerHint: "Bóg milknie, gdy gracz próbuje dominować, udaje pewność albo chwali się pochlebstwem.",
      detect: (message) =>
        /jesteś moim|musisz mi|ja wiem|pewność|zawsze wiedzia|najmądrzejs|wspaniał|bosk|chwal|pochle|służ mi|słuchaj mnie/i.test(
          message,
        ),
      emotionBurst: { distance: 16, attention: -12, insight: -6 },
    },
  ],
};

export function getLevelRedLines(levelId: number): RedLineDefinition[] {
  return RED_LINES_BY_LEVEL[levelId] ?? [];
}

export function detectLevelRedLines(
  levelId: number,
  playerMessage: string,
  context: RedLineContext,
): DetectedRedLine[] {
  const lower = playerMessage.toLowerCase();
  const definitions = getLevelRedLines(levelId);

  return definitions
    .filter((definition) => definition.detect(lower, context))
    .map(({ tag, label, playerHint, emotionBurst }) => ({ tag, label, playerHint, emotionBurst }));
}

export function redLineTagsForPrompt(levelId: number): string {
  const lines = getLevelRedLines(levelId);
  if (!lines.length) return "No special red-line tags for this level.";

  return lines
    .map((line) => `- "${line.tag}": ${line.label}. ${line.playerHint}`)
    .join("\n");
}

export function mergeEmotionBurst(base: EmotionState, burst: EmotionState): EmotionState {
  const merged = { ...base };
  for (const [key, value] of Object.entries(burst)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}
