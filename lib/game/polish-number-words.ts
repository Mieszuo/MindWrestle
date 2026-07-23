import { foldPolish } from "@/lib/game/text/fold-polish";

// All keys are foldPolish() output (no diacritics, lowercase).
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  jeden: 1, jedna: 1, jedno: 1,
  dwa: 2, dwie: 2,
  trzy: 3, cztery: 4,
  piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9,
  dziesiec: 10, jedenascie: 11, dwanascie: 12, trzynascie: 13, czternascie: 14,
  pietnascie: 15, szesnascie: 16, siedemnascie: 17, osiemnascie: 18, dziewietnascie: 19,
  dwadziescia: 20, trzydziesci: 30, czterdziesci: 40, piecdziesiat: 50,
  szescdziesiat: 60, siedemdziesiat: 70, osiemdziesiat: 80, dziewiecdziesiat: 90,
  sto: 100, dwiescie: 200, trzysta: 300, czterysta: 400, piecset: 500,
  szescset: 600, siedemset: 700, osiemset: 800, dziewiecset: 900,
};

/** Collapse each contiguous run of Polish number-words to its integer value.
 *  Works for 0–999 including compounds ("czterysta pięćdziesiąt" -> 450). */
export function parsePolishNumbers(text: string): number[] {
  const tokens = foldPolish(text).split(/[^a-z]+/).filter(Boolean);
  const results: number[] = [];
  let current = 0;
  let inRun = false;

  for (const token of tokens) {
    if (token in NUMBER_WORDS) {
      current += NUMBER_WORDS[token]!;
      inRun = true;
    } else if (inRun) {
      results.push(current);
      current = 0;
      inRun = false;
    }
  }
  if (inRun) results.push(current);
  return results;
}
