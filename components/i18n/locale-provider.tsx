"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary, type Messages } from "@/lib/i18n/messages";

const LocaleContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const messages = useMemo(() => getDictionary(locale), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT/useLocale must be used within a LocaleProvider");
  return ctx;
}

export function useT(): Messages {
  return useLocaleContext().messages;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}
