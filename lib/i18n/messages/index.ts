import type { Locale } from "@/lib/i18n/locale";
import { pl, type Messages } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

export type { Messages };
export { pl, en };

export function getDictionary(locale: Locale): Messages {
  return locale === "pl" ? pl : en;
}
