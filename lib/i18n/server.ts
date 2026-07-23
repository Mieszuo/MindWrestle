import { cookies, headers } from "next/headers";

import {
  detectRequestLocale,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  if (fromCookie) return fromCookie;
  return detectRequestLocale(await headers());
}
