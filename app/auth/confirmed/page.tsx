import type { Metadata } from "next";

import { AuthConfirmedPage } from "@/components/auth/auth-confirmed-page";
import { getDictionary } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getServerLocale());
  return {
    title: t.auth.confirmed.metaTitle,
    description: t.auth.confirmed.metaDescription,
  };
}

export default function AuthConfirmedRoutePage() {
  return <AuthConfirmedPage />;
}
