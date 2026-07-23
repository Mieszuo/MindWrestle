import { getAllLevelLore } from "@/lib/game/lore/chronicle-entries";

export type LoreUseQuality = "none" | "keyword_stuffing" | "candidate";

export interface LoreUseResult {
  candidateFragments: string[];
  quality: LoreUseQuality;
}

// Rozszerzone słowa kluczowe i proste parafrazy do pre-checku
const KEYWORDS_BY_LEVEL: Record<number, string[]> = {
  1: ["mila", "sad", "owoc", "jabłk", "jablk", "krzyk", "dziewczynk"],
  2: ["handlarz", "kupiec", "srebrn", "dług", "dlug", "zapłat", "zaplat", "sprzedał", "przekupi"],
  3: ["rycerz", "przysięg", "przysieg", "rozkaz", "zmuszon", "ślepo", "slepo", "honor"],
  4: ["ork", "niebo", "pęknięt", "pekniet", "kłamstw", "klamstw", "niesłusznie", "niewinni", "oskarżen", "kozły", "kozly"],
  5: ["mędrzec", "medrzec", "popiół", "popiol", "spalon", "zapisu", "kamień", "kamien", "kronik", "ukrył"],
  6: ["król", "krol", "brama", "strach", "władz", "wladz", "zamknął", "zamknal"],
};

export function detectLoreUse(
  playerMessage: string,
  discoveredFragments: string[],
  targetLevelId: number,
): LoreUseResult {
  if (targetLevelId <= 1 || !discoveredFragments.length) {
    return { candidateFragments: [], quality: "none" };
  }

  const message = playerMessage.toLocaleLowerCase("pl-PL");
  const wordsCount = message.split(/\s+/).length;

  const known = getAllLevelLore().filter(
    (entry) => entry.levelId < targetLevelId && discoveredFragments.includes(entry.fragmentId),
  );

  const candidateFragments: string[] = [];
  let keywordMatches = 0;

  for (const entry of known) {
    const keywords = KEYWORDS_BY_LEVEL[entry.levelId] ?? [];
    const matches = keywords.filter((kw) => message.includes(kw));
    if (matches.length > 0) {
      candidateFragments.push(entry.fragmentId);
      keywordMatches += matches.length;
    }
  }

  if (candidateFragments.length === 0) {
    return { candidateFragments: [], quality: "none" };
  }

  // Zabezpieczenie przed keyword stuffingiem:
  // jeśli gracz użył bardzo dużo słów kluczowych w bardzo krótkiej wiadomości
  const keywordDensity = keywordMatches / Math.max(wordsCount, 1);
  if (keywordDensity > 0.4 && wordsCount < 15) {
    return { candidateFragments, quality: "keyword_stuffing" };
  }

  return {
    candidateFragments,
    quality: "candidate",
  };
}
