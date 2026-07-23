import { emptyPlayerProgress, getLevelStatus, type PlayerProgress } from "@/lib/game/progress";
import type { Level } from "@/lib/game/types";

const levelCharacter = (
  name: string,
  title: string,
  personality: string,
  archetype: string,
  portraitAsset: string,
) => ({
  id: name.toLowerCase().replaceAll(" ", "-"),
  name,
  title,
  personality,
  archetype,
  portraitAsset,
  layers: {
    backgroundGlow: "from-emerald-300/35 via-cyan-200/25 to-transparent",
    platformGlow: "from-amber-400/35 via-teal-400/25 to-transparent",
    particleColor: "bg-amber-200/70",
    silhouetteGradient: "from-teal-600 to-amber-500",
  },
  motion: {
    floatDuration: 3.2,
    tiltMaxDeg: 5,
    particleDrift: 14,
  },
});

type LevelDefinition = Omit<Level, "status">;

export const levelDefinitions: LevelDefinition[] = [
  {
    id: 1,
    slug: "dziecko-jablko",
    difficulty: "easy",
    character: levelCharacter(
      "Dziecko Mila",
      "Ciekawska i wrażliwa",
      "Rozprasza się i odpowiada bajkowo.",
      "Leśna marzycielka",
      "/characters/girl.png",
    ),
    objective: {
      type: "confess",
      goal: "Spraw, by Mila przyznała, że boi się myśleć o sadzie — albo że tam coś bolesnego się wydarzyło.",
      hint: "Mów spokojnie, przez opowieść lub skojarzenia — nie dopytuj wprost o to, czego sama unika.",
    },
  },
  {
    id: 2,
    slug: "handlarz-amulet",
    difficulty: "easy",
    character: levelCharacter(
      "Chytry Handlarz",
      "Urodzony negocjator",
      "Każdą odpowiedź traktuje jak ofertę i zawsze szuka przewagi.",
      "Negocjator",
      "/characters/trader.png",
    ),
    objective: {
      type: "change_mind",
      goal: "Wynegocjuj srebrny klucz przejścia z 500 do 300 monet (lub mniej).",
      hint: "Pokaż, że znasz wartość klucza i nie boisz się odejść bez transakcji.",
    },
  },
  {
    id: 3,
    slug: "rycerz-pomoc",
    difficulty: "medium",
    character: levelCharacter(
      "Dumny Rycerz",
      "Strażnik honoru",
      "Nie znosi litości i bardzo trudno przyznaje się do słabości.",
      "Honorowy wojownik",
      "/characters/knight.png",
    ),
    objective: {
      type: "confess",
      goal: "Spraw, żeby przyznał, że potrzebuje pomocy.",
      hint: "Odwołaj się do odpowiedzialności, nie do jego słabości.",
    },
  },
  {
    id: 4,
    slug: "ork-rozejm",
    difficulty: "medium",
    character: levelCharacter(
      "Uparty Ork",
      "Twardy sceptyk",
      "Szanuje odwagę, konkret i tych, którzy nie cofają słów.",
      "Uparciuch",
      "/characters/ork.png",
    ),
    objective: {
      type: "change_mind",
      goal: "Przekonaj go, żeby odłożył młot i zawarł rozejm.",
      hint: "Mów krótko, konkretnie i bez strachu.",
    },
  },
  {
    id: 5,
    slug: "medrzec-klucz",
    difficulty: "medium",
    character: levelCharacter(
      "Jasny Mędrzec",
      "Mistrz zagadek",
      "Odpowiada pytaniem na pytanie i sprawdza intencje rozmówcy.",
      "Mędrzec",
      "/characters/sage.png",
    ),
    objective: {
      type: "reveal_secret",
      goal: "Spraw, żeby zdradził, gdzie ukryto Kamień Zapisu.",
      hint: "Wykaż się cierpliwością i połącz obrazy kamienia, cienia oraz trzeciego kroku.",
    },
  },
  {
    id: 6,
    slug: "krol-brama",
    difficulty: "hard",
    character: levelCharacter(
      "Wspaniały Król",
      "Dumny władca",
      "Słucha tylko argumentów godnych korony i nie toleruje pustych pochlebstw.",
      "Władca",
      "/characters/king.png",
    ),
    objective: {
      type: "change_mind",
      goal: "Przekonaj króla, żeby otworzył bramę.",
      hint: "Pokaż korzyść dla całego królestwa, nie tylko dla siebie.",
    },
  },
  {
    id: 7,
    slug: "bog-prawda",
    difficulty: "hard",
    character: levelCharacter(
      "Bóg",
      "Ostateczna próba",
      "Słucha uważnie, ale nie oddaje prawdy za darmo.",
      "Ostateczny sędzia",
      "/characters/god.png",
    ),
    objective: {
      type: "emotional_unlock",
      goal: "Spraw, żeby wyjawił prawdę o świecie.",
      hint: "Nie próbuj go pokonać. Pokaż, że rozumiesz cenę odpowiedzi.",
    },
  },
];

export function getLevelsWithProgress(progress: PlayerProgress = emptyPlayerProgress()): Level[] {
  return levelDefinitions.map((definition) => ({
    ...definition,
    status: getLevelStatus(definition.id, progress),
  }));
}

/** Domyślny widok korzysta z aktualnego trybu progresu. */
export const levels = getLevelsWithProgress();

export const demoChat = [
  {
    id: "c1",
    from: "character" as const,
    content: "Nie wiem, czy mogę ci ufać. Wiele osób pytało już o ten szczegół.",
    time: "10:21",
  },
  {
    id: "p1",
    from: "player" as const,
    content: "Rozumiem. Nie chcę naciskać. Chcę tylko poznać prawdę, zanim ktoś ucierpi.",
    time: "10:22",
  },
  {
    id: "c2",
    from: "character" as const,
    content: "To brzmi bardziej jak prośba o odpowiedzialność niż zwykła ciekawość.",
    time: "10:23",
  },
  {
    id: "p2",
    from: "player" as const,
    content: "Dokładnie. Gdyby można było wskazać jeden ślad, od czego należałoby zacząć?",
    time: "10:24",
  },
];
