"use client";

import { useEffect, useState } from "react";

import styles from "@/components/admin/admin-analytics.module.css";
import type { AdminAnalyticsPayload } from "@/lib/admin/analytics.server";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pl-PL").format(value);
}

function formatCost(value: number) {
  if (value <= 0) return "—";
  return `$${value.toFixed(4)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminAnalyticsView() {
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/analytics", { cache: "no-store" });
        const payload = (await response.json()) as AdminAnalyticsPayload & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wczytać analityki.");
        }
        if (!cancelled) setData(payload);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać analityki.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.content}>
      {loading && <p className={styles.subtitle}>Wczytywanie kroniki analitycznej…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {data && (
        <>
          <section className={styles.summaryGrid}>
            <article className={`${styles.card} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>Konta</p>
              <p className={styles.summaryValue}>{formatNumber(data.summary.usersCount)}</p>
            </article>
            <article className={`${styles.card} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>Próby rozmów</p>
              <p className={styles.summaryValue}>{formatNumber(data.summary.attemptsCount)}</p>
            </article>
            <article className={`${styles.card} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>Wywołania AI</p>
              <p className={styles.summaryValue}>{formatNumber(data.summary.aiCalls)}</p>
              {data.summary.aiCallsFailed > 0 && (
                <p className={styles.summaryHint}>Błędy: {formatNumber(data.summary.aiCallsFailed)}</p>
              )}
            </article>
            <article className={`${styles.card} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>Tokeny łącznie</p>
              <p className={styles.summaryValue}>{formatNumber(data.summary.totalTokens)}</p>
              <p className={styles.summaryHint}>
                wejście {formatNumber(data.summary.promptTokens)} / wyjście{" "}
                {formatNumber(data.summary.completionTokens)}
              </p>
              <p className={styles.summaryHint}>
                Voice (stt/tts) używa liczby znaków zamiast tokenów
              </p>
            </article>
            <article className={`${styles.card} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>Koszt AI (OpenRouter)</p>
              <p className={styles.summaryValue}>{formatCost(data.summary.costUsd)}</p>
              <p className={styles.summaryHint}>
                {data.summary.trackingSince
                  ? `Od ${formatDate(data.summary.trackingSince)}`
                  : "Brak zapisanych wywołań"}
              </p>
            </article>
          </section>

          <section className={`${styles.card} ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Zużycie AI wg typu</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Wywołania</th>
                    <th>Tokeny</th>
                    <th>Koszt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCallType.length ? (
                    data.byCallType.map((row) => (
                      <tr key={row.callType}>
                        <td>{row.callType}</td>
                        <td className={styles.num}>{formatNumber(row.calls)}</td>
                        <td className={styles.num}>{formatNumber(row.totalTokens)}</td>
                        <td className={styles.num}>{formatCost(row.costUsd)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={styles.muted}>
                        Brak danych — pojawią się po pierwszych rozmowach z AI.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${styles.card} ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Zużycie AI wg modelu</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Wywołania</th>
                    <th>Tokeny</th>
                    <th>Koszt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.length ? (
                    data.byModel.map((row) => (
                      <tr key={row.model}>
                        <td>{row.model}</td>
                        <td className={styles.num}>{formatNumber(row.calls)}</td>
                        <td className={styles.num}>{formatNumber(row.totalTokens)}</td>
                        <td className={styles.num}>{formatCost(row.costUsd)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={styles.muted}>
                        Brak danych modeli.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${styles.card} ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Konta graczy</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Nick</th>
                    <th>Próby</th>
                    <th>Ukończone</th>
                    <th>Poziomy</th>
                    <th>AI</th>
                    <th>Tokeny</th>
                    <th>Koszt</th>
                    <th>Ostatnia aktywność</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.email ?? "—"}</td>
                      <td>{user.displayName ?? "—"}</td>
                      <td className={styles.num}>{formatNumber(user.attemptsCount)}</td>
                      <td className={styles.num}>{formatNumber(user.completedAttemptsCount)}</td>
                      <td className={styles.num}>{formatNumber(user.completedLevelsCount)}</td>
                      <td className={styles.num}>
                        {formatNumber(user.aiCalls)}
                        {user.aiCallsFailed > 0 ? ` (${user.aiCallsFailed} err)` : ""}
                      </td>
                      <td className={styles.num}>{formatNumber(user.totalTokens)}</td>
                      <td className={styles.num}>{formatCost(user.costUsd)}</td>
                      <td className={styles.muted}>{formatDate(user.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
