export const SAGE_LEVEL_ID = 5;

export function isSageKeyGuessLevel(levelId: number, objectiveType?: string) {
  return levelId === SAGE_LEVEL_ID && (!objectiveType || objectiveType === "SECRET_REVEAL");
}
