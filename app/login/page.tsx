import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";
import { getDictionary } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getServerLocale());
  return {
    title: t.auth.login.metaTitle,
    description: t.auth.login.metaDescription,
  };
}

export default function LoginPage() {
  return <AuthPage />;
}
