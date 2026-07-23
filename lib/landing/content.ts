import { LEVEL_CHARACTER_PORTRAITS } from "@/lib/game/mapCharacters";

export const navItems = [
  { key: "howItWorks", href: "#jak-to-dziala" },
  { key: "gameplay", href: "#rozgrywka" },
  { key: "characters", href: "#postacie" },
] as const;

export const howItWorksSteps = [
  {
    number: 1,
    icon: "message" as const,
    key: "meetTheGuardian",
  },
  {
    number: 2,
    icon: "heart" as const,
    key: "listenAndChoose",
  },
  {
    number: 3,
    icon: "trophy" as const,
    key: "carryTruthForward",
  },
] as const;

export const characters = [
  {
    id: "1",
    level: 1,
    portrait: LEVEL_CHARACTER_PORTRAITS[1],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(120, 160, 100, 0.32), transparent 52%)",
  },
  {
    id: "2",
    level: 2,
    portrait: LEVEL_CHARACTER_PORTRAITS[2],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(200, 150, 80, 0.28), transparent 52%)",
  },
  {
    id: "3",
    level: 3,
    portrait: LEVEL_CHARACTER_PORTRAITS[3],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(140, 165, 195, 0.26), transparent 52%)",
  },
  {
    id: "4",
    level: 4,
    portrait: LEVEL_CHARACTER_PORTRAITS[4],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(90, 140, 75, 0.3), transparent 52%)",
  },
  {
    id: "5",
    level: 5,
    portrait: LEVEL_CHARACTER_PORTRAITS[5],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(160, 130, 190, 0.22), transparent 52%)",
  },
  {
    id: "6",
    level: 6,
    portrait: LEVEL_CHARACTER_PORTRAITS[6],
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(200, 160, 90, 0.3), transparent 52%)",
  },
  {
    id: "7",
    level: 7,
    portrait: LEVEL_CHARACTER_PORTRAITS[7],
    backdrop:
      "radial-gradient(circle at 50% 22%, rgba(220, 190, 120, 0.35), transparent 48%)",
  },
] as const;
