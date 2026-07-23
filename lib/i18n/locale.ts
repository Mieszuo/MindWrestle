import type { Json } from "@/lib/supabase/database.types";

export const LOCALE_COOKIE_NAME = "mindwrestle_locale";

export const LOCALES = ["pl", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type ProfileSettings = {
  locale?: Locale;
} & Record<string, Json | undefined>;

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

export function localeLanguageName(locale: Locale) {
  return locale === "pl" ? "Polish" : "English";
}

export function localeElevenLabsCode(locale: Locale) {
  return locale === "pl" ? "pl" : "en";
}

export function localePromptInstruction(locale: Locale) {
  return `Reply language: ${localeLanguageName(locale)}. Keep all hidden reasoning and JSON keys in English, but the visible character message and narration must be in ${localeLanguageName(locale)}.`;
}

export function parseProfileSettings(value: Json | null | undefined): ProfileSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Json | undefined>;
  const locale = normalizeLocale(record.locale);
  return locale ? { ...record, locale } : { ...record };
}

export function localeFromProfileSettings(value: Json | null | undefined): Locale | null {
  return parseProfileSettings(value).locale ?? null;
}

export function mergeLocaleIntoSettings(value: Json | null | undefined, locale: Locale): ProfileSettings {
  return { ...parseProfileSettings(value), locale };
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

function localeFromCountry(country: string | null) {
  if (!country) return null;
  const normalized = country.trim().toUpperCase();
  if (!normalized) return null;
  return normalized === "PL" ? "pl" : "en";
}

function localeFromAcceptLanguage(acceptLanguage: string | null) {
  if (!acceptLanguage) return null;
  const languages = acceptLanguage
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);

  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return null;
}

export function detectRequestLocale(headers: Headers): Locale {
  const cookieLocale = normalizeLocale(getCookieValue(headers.get("cookie"), LOCALE_COOKIE_NAME));
  if (cookieLocale) return cookieLocale;

  const countryLocale = localeFromCountry(
    headers.get("x-vercel-ip-country") ??
      headers.get("cf-ipcountry") ??
      headers.get("x-country-code"),
  );
  if (countryLocale) return countryLocale;

  return localeFromAcceptLanguage(headers.get("accept-language")) ?? "en";
}

export function resolveProfileLocale(settings: Json | null | undefined, headers: Headers): Locale {
  return localeFromProfileSettings(settings) ?? detectRequestLocale(headers);
}

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}
