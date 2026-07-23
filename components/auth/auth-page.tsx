"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import styles from "@/components/auth/auth-screen.module.css";
import { useT } from "@/components/i18n/locale-provider";
import { PressableButton } from "@/components/ui/pressable-button";

export function AuthPage() {
  const t = useT();

  return (
    <main className={styles.screen}>
      <div className={styles.backdropGlow} aria-hidden />

      <div className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.kicker}>
            <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            MindWrestle
          </p>
          <h1 className={styles.title}>{t.auth.page.title}</h1>
          <p className={styles.subtitle}>{t.auth.page.subtitle}</p>
        </header>

        <Suspense fallback={<p className={styles.hint}>{t.common.loading}</p>}>
          <AuthForm />
        </Suspense>

        <div className={styles.footer}>
          <Link href="/">
            <PressableButton tone="secondary">{t.auth.page.backButton}</PressableButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
