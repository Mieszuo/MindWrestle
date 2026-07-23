import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export function getThinkingPhrase(levelId: number, characterName: string | undefined, locale: Locale): string {
  const content = getDictionary(locale).content.thinking;
  const levelKey = String(levelId) as keyof typeof content.byLevel;
  const pool: readonly string[] = content.byLevel[levelKey] ?? content.generic;
  const index = Math.floor(Date.now() / 4000) % pool.length;
  const phrase = pool[index];

  if (characterName && levelId > 7) {
    const short = characterName.split(" ").at(-1) ?? characterName;
    return content.fallback(short);
  }

  return phrase;
}
