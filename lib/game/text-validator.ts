import { foldPolish } from "@/lib/game/text/fold-polish";

export function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeText(input: string) {
  return foldPolish(input.replace(/[„”"']/g, "")).trim();
}

export function containsExactWord(text: string, word: string) {
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(word);
  const regex = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(normalizedWord)}(?![\\p{L}\\p{N}_])`,
    "u",
  );

  return regex.test(normalizedText);
}
