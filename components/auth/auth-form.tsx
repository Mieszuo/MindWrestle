"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import styles from "@/components/auth/auth-screen.module.css";
import { useT } from "@/components/i18n/locale-provider";
import { PressableButton } from "@/components/ui/pressable-button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

function validateDisplayName(value: string, errorMessage: string) {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 24) {
    return errorMessage;
  }
  return null;
}

function validatePassword(value: string, errorMessage: string) {
  if (value.length < 8) {
    return errorMessage;
  }
  return null;
}

export function AuthForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/levels";
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(
    authError === "auth" ? t.auth.form.loginFailedError : null,
  );

  useEffect(() => {
    setStatus("idle");
    setMessage(authError === "auth" ? t.auth.form.loginFailedError : null);
  }, [mode, authError, t]);

  async function persistDisplayName(userId: string, name: string) {
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from("profiles").upsert(
      {
        id: userId,
        display_name: name,
        updated_at: now,
      },
      { onConflict: "id" },
    );
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(
        error.message.includes("Invalid login credentials")
          ? t.auth.form.invalidCredentialsError
          : error.message,
      );
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const nickError = validateDisplayName(displayName, t.auth.form.nickLengthError);
    if (nickError) {
      setStatus("error");
      setMessage(nickError);
      return;
    }

    const passwordError = validatePassword(password, t.auth.form.passwordLengthError);
    if (passwordError) {
      setStatus("error");
      setMessage(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setStatus("error");
      setMessage(t.auth.form.passwordMismatchError);
      return;
    }

    const trimmedNick = displayName.trim();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: trimmedNick },
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    if (data.user) {
      await persistDisplayName(data.user.id, trimmedNick);
    }

    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }

    setStatus("success");
    setMessage(t.auth.form.registerSuccessMessage);
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label={t.auth.form.modeTabsAriaLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={cn(styles.tab, mode === "login" && styles.tabActive)}
          onClick={() => setMode("login")}
        >
          {t.auth.form.loginTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={cn(styles.tab, mode === "register" && styles.tabActive)}
          onClick={() => setMode("register")}
        >
          {t.auth.form.registerTab}
        </button>
      </div>

      <form className={styles.form} onSubmit={mode === "login" ? handleLogin : handleRegister}>
        {mode === "register" && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="displayName">
              {t.auth.form.nickLabel}
            </label>
            <input
              id="displayName"
              className={styles.input}
              type="text"
              autoComplete="nickname"
              minLength={2}
              maxLength={24}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t.auth.form.nickPlaceholder}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            {t.auth.form.emailLabel}
          </label>
          <input
            id="email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.auth.form.emailPlaceholder}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            {t.auth.form.passwordLabel}
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.auth.form.passwordPlaceholder}
          />
        </div>

        {mode === "register" && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="passwordConfirm">
              {t.auth.form.passwordConfirmLabel}
            </label>
            <input
              id="passwordConfirm"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder={t.auth.form.passwordConfirmLabel}
            />
          </div>
        )}

        <PressableButton type="submit" className="w-full" disabled={status === "loading"} sound="none">
          {status === "loading"
            ? t.auth.form.submitLoading
            : mode === "login"
              ? t.auth.form.loginSubmit
              : t.auth.form.registerSubmit}
        </PressableButton>

        {message && (
          <p
            className={cn(styles.status, status === "error" ? styles.statusError : styles.statusSuccess)}
            role="status"
          >
            {message}
          </p>
        )}

        <p className={styles.hint}>
          {mode === "login" ? t.auth.form.loginHint : t.auth.form.registerHint}
        </p>
      </form>
    </>
  );
}
