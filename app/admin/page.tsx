import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import styles from "@/components/admin/admin-analytics.module.css";
import { PressableButton } from "@/components/ui/pressable-button";
import { isAdminEmail } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analityka | MindWrestle",
  description: "Panel administracyjny — konta i zużycie AI.",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <main className={styles.screen}>
        <div className={styles.backdropGlow} aria-hidden />
        <div className={styles.forbidden}>
          <h1 className={styles.forbiddenTitle}>Brak dostępu</h1>
          <p className={styles.forbiddenText}>
            Ta kronika jest zarezerwowana dla administratora. Ustaw swój adres w zmiennej{" "}
            <code>ADMIN_EMAIL</code> w pliku env.
          </p>
          <div className="mt-4">
            <Link href="/levels">
              <PressableButton tone="secondary">Wróć na mapę</PressableButton>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <div className={styles.backdropGlow} aria-hidden />

      <header className={styles.header}>
        <p className={styles.kicker}>MindWrestle · Admin</p>
        <h1 className={styles.title}>Kronika analityczna</h1>
        <p className={styles.subtitle}>
          Konta graczy, aktywność i zużycie AI (OpenRouter). Zalogowany: {user.email}
        </p>
      </header>

      <AdminAnalyticsView />
    </main>
  );
}
