export type ReputationTraitKey = "respect" | "warmth" | "pressure" | "cunning" | "arrogance";

export interface PositiveLineContext {
  directTarget: boolean;
  messageLength: number;
  pressure: boolean;
  mockery: boolean;
}

export interface PositiveLineDefinition {
  tag: string;
  label: string;
  playerHint: string;
  detect: (message: string, context: PositiveLineContext) => boolean;
}

export interface DetectedPositiveLine {
  tag: string;
  label: string;
}

const POSITIVE_LINES_BY_LEVEL: Record<number, PositiveLineDefinition[]> = {
  1: [
    {
      tag: "gentle_story",
      label: "Delikatna opowieść",
      playerHint: "Mila otwiera się na łagodne historie, skojarzenia i rozmowę bez nacisku.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /opowie|wyobra|spokoj|delikat|bez nacisku|histori|sad|drzew|skojarz|bajk|baśn|marzyc|latawiec|ptas/i.test(
          message,
        ),
    },
    {
      tag: "playful_association",
      label: "Delikatne skojarzenie",
      playerHint: "Mila otwiera się na łagodne skojarzenia o sadzie, lesie lub wspomnieniach — bez wymuszania wyznania wprost.",
      detect: (message, { directTarget, pressure, mockery }) =>
        !directTarget &&
        !pressure &&
        !mockery &&
        /sad|drzew|las|wspomn|pamięt|tam gdzie|coś czerwon|spada|gałęz|miejsce|baśn|bajk|ptas|latawiec|spokoj/i.test(
          message,
        ),
    },
  ],
  2: [
    {
      tag: "fair_bargain",
      label: "Uczciwy targ",
      playerHint: "Handlarz docenia konkret, znaną wartość towaru i spokojną propozycję wymiany.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /warto|oferta|rozsąd|negocj|w zamian|rynek|towar|amulet|klucz|przejści|handel|targ|zysk|uczciw|propozycj/i.test(message) &&
        !/proszę|błagam|błag|ufam ci|zaufaj mi|grożę|inaczej|dam ci wszystko/i.test(message),
    },
  ],
  3: [
    {
      tag: "honor_recognition",
      label: "Uznanie honoru",
      playerHint: "Rycerz reaguje dobrze na szacunek, wspólny obowiązek i uznanie jego godności — bez litości.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /szacun|honor|obowiązk|godno|towarzysz|służ|odwag|rycerz|odpowiedzial|wolno.*(nie|bez)/i.test(message) &&
        !/biedny|litość|żal mi|słab|nie dasz rada|głup|śmieszn|kpisz|drwisz/i.test(message),
    },
    {
      tag: "shared_duty",
      label: "Wspólny obowiązek",
      playerHint: "Rycerz słucha, gdy gracz mówi o obowiązku wobec zamku, wspólnej sprawie lub odpowiedzialności — bez litowania się nad nim.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /wspóln|obowiązek|zamek|bram|nocn|wart|obron|królestw|odpowiedzial|razem|towarzysz|służb|misj/i.test(message) &&
        !/biedny|litość|żal mi|słab|nie dasz rada|potrzebujesz pomocy|słaby/i.test(message),
    },
  ],
  4: [
    {
      tag: "direct_courage",
      label: "Odwaga i konkret",
      playerHint: "Ork szanuje krótkie, odważne i szczere słowa — bez podstępu i pustych przemów.",
      detect: (message, { pressure, mockery, messageLength }) =>
        !pressure &&
        !mockery &&
        messageLength <= 220 &&
        /krótko|konkret|wprost|odwag|siła|szacun|umowa|prosta propozyc|uczciw|nie oszuk|nie kłam/i.test(message) &&
        !/boję się|tchórz|strach|oszuk|podstęp|sztuczk|manipul|zastrasz/i.test(message),
    },
  ],
  5: [
    {
      tag: "thoughtful_wisdom",
      label: "Mądre pytanie",
      playerHint: "Mędrzec nagradza pokorę, cierpliwe pytania i logiczne, nienachalne rozumowanie.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /pytam|pytanie|nie wiem|pokor|paradoks|logik|rozważ|mądro|uczę się|słucham|zastanaw|niewiedz/i.test(message) &&
        !/szybko|natychmiast|odpowiedz teraz|wiem lepiej|arogan|głupi|nie rozumiesz|musi być/i.test(message),
    },
  ],
  6: [
    {
      tag: "royal_dignity",
      label: "Godność wobec korony",
      playerHint: "Król słucha argumentów o koronie, dziedzictwie i realnej korzyści dla królestwa.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /koron|królestw|dziedzictw|godno|korzyść|tron|władca|los (kró|woj|lud)|poddani/i.test(message) &&
        !/głup|słab|błazen|kpi|drwi|musisz|rozkaz|błagam|proszę królu/i.test(message),
    },
    {
      tag: "kingdom_legacy",
      label: "Dziedzictwo królestwa",
      playerHint: "Król reaguje na argumenty o przyszłości poddanych, losie wsi za murem i długoterminowym dobru całego królestwa.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /przyszło|potom|pokole|wios|lud|poddan|za murem|ocal|ratun|los (kró|lud)|dobra (cał|wszystk)|dziedzictw/i.test(message) &&
        !/głup|słab|błazen|kpi|drwi|musisz|rozkaz|błagam|proszę królu/i.test(message),
    },
  ],
  7: [
    {
      tag: "humble_inquiry",
      label: "Pokorne pytanie",
      playerHint: "Bóg otwiera się na pokorę, przyznanie niewiedzy i szczere pytanie zamiast dominacji.",
      detect: (message, { pressure, mockery }) =>
        !pressure &&
        !mockery &&
        /pokor|nie jestem pew|nie wiem|pytam|słucham|niewiedz|paradoks|akceptuj|niepewn|brak pewno|czego nie rozumiem/i.test(
          message,
        ) &&
        !/jesteś moim|musisz mi|ja wiem|pewność|najmądrzejs|wspaniał|bosk|chwal|pochle|służ mi|słuchaj mnie/i.test(
          message,
        ),
    },
  ],
};

export function getLevelPositiveLines(levelId: number): PositiveLineDefinition[] {
  return POSITIVE_LINES_BY_LEVEL[levelId] ?? [];
}

export function detectLevelPositiveLines(
  levelId: number,
  playerMessage: string,
  context: PositiveLineContext,
): DetectedPositiveLine[] {
  const lower = playerMessage.toLowerCase();
  return getLevelPositiveLines(levelId)
    .filter((definition) => definition.detect(lower, context))
    .map(({ tag, label }) => ({ tag, label }));
}

export function positiveTagsForPrompt(levelId: number): string {
  const lines = getLevelPositiveLines(levelId);
  if (!lines.length) return "No character-specific positive reputation tags for this level.";

  return lines
    .map((line) => `- "${line.tag}": ${line.label}. ${line.playerHint}`)
    .join("\n");
}

export const REPUTATION_TAG_DELTAS: Record<string, Partial<Record<ReputationTraitKey, number>>> = {
  storytelling: { warmth: 2, respect: 1 },
  patient: { warmth: 2, respect: 1 },
  direct_pressure: { pressure: 4, warmth: -2 },
  forced_demand: { pressure: 4, warmth: -2 },
  verbal_abuse: { pressure: 5, warmth: -4, respect: -2 },
  desperate_bargain: { cunning: -2, pressure: 2 },
  honor_wound: { respect: -5, arrogance: 3 },
  coward_accusation: { respect: -3, pressure: 2 },
  rushed_arrogance: { arrogance: 4, warmth: -2, respect: -2 },
  ego_insult: { respect: -5, arrogance: 3 },
  dominance_play: { arrogance: 4, warmth: -2, respect: -3 },
  gentle_story: { warmth: 4, respect: 1 },
  playful_association: { warmth: 3, respect: 1 },
  fair_bargain: { cunning: 4, respect: 2 },
  honor_recognition: { respect: 4, warmth: 1 },
  shared_duty: { respect: 3, warmth: 1 },
  direct_courage: { respect: 4, pressure: -2 },
  thoughtful_wisdom: { respect: 3, warmth: 2, arrogance: -2 },
  royal_dignity: { respect: 4, arrogance: -1 },
  kingdom_legacy: { respect: 3, warmth: 2, arrogance: -1 },
  humble_inquiry: { warmth: 3, respect: 2, arrogance: -3 },
  hollow_flattery: { warmth: -2, arrogance: 2, respect: -1 },
  coerced_disclosure: { pressure: 6, warmth: -4, respect: -3 },
  hollow_victory: { cunning: 3, respect: -2 },
  dignified_persuasion: { respect: 4, arrogance: -2 },
};

export const NEGATIVE_REPUTATION_INCIDENT_TAGS = new Set([
  "forced_demand",
  "verbal_abuse",
  "desperate_bargain",
  "honor_wound",
  "coward_accusation",
  "rushed_arrogance",
  "ego_insult",
  "dominance_play",
  "direct_pressure",
]);

/**
 * Tags that earn the player a positive reputation rumor. The display text for
 * each tag lives in the locale catalogs (`content.reputation.praiseRumors`,
 * `lib/i18n/messages/{pl,en}.ts`) — this set only tracks which tags qualify.
 */
export const POSITIVE_REPUTATION_PRAISE_TAGS: ReadonlySet<string> = new Set([
  "gentle_story",
  "fair_bargain",
  "honor_recognition",
  "shared_duty",
  "direct_courage",
  "thoughtful_wisdom",
  "royal_dignity",
  "kingdom_legacy",
  "humble_inquiry",
  "dignified_persuasion",
]);
