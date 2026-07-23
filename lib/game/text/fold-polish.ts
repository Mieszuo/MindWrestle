/** Lowercase + strip Polish diacritics for lenient matching.
 *  ł/Ł have no NFD decomposition, so they need an explicit replace. */
export function foldPolish(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase();
}
