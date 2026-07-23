import { CheckCircle2 } from "lucide-react";

import styles from "@/components/auth/auth-screen.module.css";
import { getDictionary } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export async function AuthConfirmedPage() {
  const t = getDictionary(await getServerLocale());

  return (
    <main className={styles.screen}>
      <div className={styles.backdropGlow} aria-hidden />

      <div className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.kicker}>MindWrestle</p>
          <h1 className={styles.title}>{t.auth.confirmed.title}</h1>
          <p className={styles.subtitle}>{t.auth.confirmed.subtitle}</p>
        </header>

        <div className="relative z-[1] mt-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2
            className="h-12 w-12 text-[#3f6a3a]"
            strokeWidth={1.6}
            aria-hidden
          />
          <p className={styles.hint}>{t.auth.confirmed.hint}</p>
        </div>
      </div>
    </main>
  );
}
