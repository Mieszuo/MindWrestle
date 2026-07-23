"use client";

import { Crown, KeyRound, RotateCcw, Settings, ShoppingBag, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AttemptPurchaseModal } from "@/components/billing/attempt-purchase-modal";
import type { PlayerReputation } from "@/lib/game/reputation";
import type { Locale } from "@/lib/i18n/locale";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { PressableButton } from "@/components/ui/pressable-button";
import { useAudio } from "@/hooks/use-audio";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/game/level-map/LevelMap.module.css";

type Tab = "profile" | "wallet" | "results" | "characters" | "settings" | "account";

type BillingEntitlements = {
  paidRemaining: number;
  free: { limit: number; used: number; remaining: number };
  unavailable?: boolean;
  purchaseHistory: Array<{
    id: string;
    attempts: number;
    description: string;
    createdAt: string;
    status: "credited";
  }>;
};

type PlayerSummary = {
  profile: {
    displayName: string | null;
    email: string | null;
    createdAt: string;
    settings: unknown;
    locale: Locale;
  };
  reputation: PlayerReputation;
  summary: {
    attemptsCount: number;
    completedAttemptsCount: number;
    failedAttemptsCount: number;
    abandonedAttemptsCount: number;
    successRate: number;
    averageTime: string | null;
    bestTime: string | null;
    averageTurns: number | null;
    completedLevelsCount: number;
    totalLevelsCount: number;
  };
  perLevel: Array<{
    levelId: number;
    characterName: string;
    difficulty: string;
    attemptsCount: number;
    completedCount: number;
    failedCount: number;
    successRate: number;
    bestTime: string | null;
    averageTime: string | null;
    averageTurns: number | null;
    lastStatus: string | null;
  }>;
  recentAttempts: Array<{
    id: string;
    levelId: number;
    characterName: string;
    status: string;
    startedAt: string;
    duration: string | null;
    turnsCount: number;
    goalProgress: number;
  }>;
};

function StatCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className={styles.playerStatCard}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div className={styles.playerBarRow}>
      <span>{label}</span>
      <div className={styles.playerBarTrack} aria-hidden>
        <i style={{ width: `${width}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl" : "en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PlayerPanel({ initialTab = "profile", onClose }: { initialTab?: Tab; onClose: () => void }) {
  const t = useT();
  const uiLocale = useLocale();
  const audio = useAudio();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<PlayerSummary | null>(null);
  const [billing, setBilling] = useState<BillingEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [localeStatus, setLocaleStatus] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [attemptShopOpen, setAttemptShopOpen] = useState(false);
  const [resettingGame, setResettingGame] = useState(false);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "profile", label: t.playerPanel.tabs.profile },
    { id: "wallet", label: t.playerPanel.tabs.wallet },
    { id: "results", label: t.playerPanel.tabs.results },
    { id: "characters", label: t.playerPanel.tabs.characters },
    { id: "settings", label: t.playerPanel.tabs.settings },
    { id: "account", label: t.playerPanel.tabs.account },
  ];

  const incidentLabels: Record<string, string> = t.playerPanel.incidentLabels;
  const praiseLabels: Record<string, string> = t.playerPanel.praiseLabels;
  const statusLabels: Record<string, string> = t.playerPanel.statusLabels;

  useEffect(() => {
    let active = true;
    fetch("/api/player/summary")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(t.playerPanel.fetchSummaryError))))
      .then((payload: PlayerSummary) => {
        if (!active) return;
        setData(payload);
        setDisplayName(payload.profile.displayName ?? "");
        setLocale(payload.profile.locale ?? "en");
        setError(null);
      })
      .catch((fetchError: Error) => {
        if (active) setError(fetchError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/billing/entitlements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(t.playerPanel.fetchBillingError))))
      .then((payload: { entitlements?: BillingEntitlements; warning?: string }) => {
        if (!active) return;
        setBilling(payload.entitlements ?? null);
        setBillingError(
          payload.warning === "BILLING_UNAVAILABLE" || payload.entitlements?.unavailable
            ? t.billing.purchaseModal.unavailableError
            : null,
        );
      })
      .catch((fetchError: Error) => {
        if (active) setBillingError(fetchError.message);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileStatus(t.playerPanel.profile.savingStatus);

    const response = await fetch("/api/player/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setProfileStatus(payload?.error ?? t.playerPanel.profile.saveNicknameError);
      return;
    }

    setData((current) =>
      current
        ? { ...current, profile: { ...current.profile, displayName: payload.profile.displayName } }
        : current,
    );
    setProfileStatus(t.playerPanel.profile.nicknameSaved);
  }

  async function saveLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setLocaleStatus(t.playerPanel.settings.savingLocale);

    const response = await fetch("/api/player/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setLocaleStatus(payload?.error ?? t.playerPanel.settings.saveLocaleError);
      return;
    }

    setData((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              settings: payload.profile.settings,
              locale: payload.profile.settings?.locale ?? nextLocale,
            },
          }
        : current,
    );
    setLocaleStatus(t.playerPanel.settings.localeSavedByLocale[nextLocale]);
    router.refresh();
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordStatus(t.playerPanel.account.updatingStatus);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setPasswordStatus(updateError.message);
      return;
    }

    setPassword("");
    setPasswordStatus(t.playerPanel.account.passwordChanged);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function resetGame() {
    const warned = window.confirm(t.playerPanel.profile.resetConfirm);
    if (!warned) return;

    const confirmation = window.prompt(t.playerPanel.profile.resetPrompt);
    if (confirmation !== "RESET") {
      setAccountStatus(t.playerPanel.profile.resetCancelled);
      return;
    }

    setResettingGame(true);
    setAccountStatus(t.playerPanel.profile.resetting);
    const response = await fetch("/api/player/reset", { method: "POST" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setResettingGame(false);
      setAccountStatus(payload?.error ?? t.playerPanel.profile.resetError);
      return;
    }

    window.location.href = "/intro";
  }

  const maxAttempts = Math.max(1, ...(data?.perLevel.map((level) => level.attemptsCount) ?? [1]));

  return (
    <div
      className={`${styles.leaderboardBackdrop} ${styles.uiFadeItem}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`${styles.leaderboardModal} ${styles.playerPanel}`} role="dialog" aria-modal="true" aria-labelledby="player-panel-title">
        <PressableButton tone="icon" className={styles.leaderboardClose} onClick={onClose} aria-label={t.playerPanel.closeAriaLabel}>
          <X aria-hidden />
        </PressableButton>

        <div className={styles.leaderboardHeading}>
          <Crown aria-hidden />
          <p>{t.playerPanel.kicker}</p>
          <h2 id="player-panel-title">{t.playerPanel.title}</h2>
        </div>

        <div className={styles.playerTabs} role="tablist" aria-label={t.playerPanel.tabsAriaLabel}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? styles.playerTabActive : ""}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <div className={styles.playerEmpty}>{t.playerPanel.loading}</div>}
        {error && <div className={styles.playerEmpty}>{error}</div>}

        {data && !loading && !error && (
          <div className={styles.playerPanelBody}>
            {activeTab === "profile" && (
              <div className={styles.playerSection}>
                <div className={styles.playerHeroCard}>
                  <UserRound aria-hidden />
                  <div>
                    <span>{t.playerPanel.profile.heroLabel}</span>
                    <strong>{data.profile.displayName || t.playerPanel.profile.noNickname}</strong>
                    <p>{data.profile.email ?? t.playerPanel.profile.noEmail}</p>
                  </div>
                </div>
                <div className={styles.playerStatsGrid}>
                  <StatCard
                    label={t.playerPanel.profile.stats.completedLevels}
                    value={`${data.summary.completedLevelsCount}/${data.summary.totalLevelsCount}`}
                  />
                  <StatCard label={t.playerPanel.profile.stats.totalAttempts} value={data.summary.attemptsCount} />
                  <StatCard label={t.playerPanel.profile.stats.successRate} value={`${data.summary.successRate}%`} />
                  <StatCard label={t.playerPanel.profile.stats.bestTime} value={data.summary.bestTime} />
                </div>
                <div className={styles.playerChartCard}>
                  <h3>{t.playerPanel.profile.reputationHeading}</h3>
                  <MiniBar label={t.playerPanel.profile.traits.renown} value={data.reputation.renown} max={100} />
                  <MiniBar label={t.playerPanel.profile.traits.respect} value={data.reputation.traits.respect} max={100} />
                  <MiniBar label={t.playerPanel.profile.traits.warmth} value={data.reputation.traits.warmth} max={100} />
                  <MiniBar label={t.playerPanel.profile.traits.pressure} value={data.reputation.traits.pressure} max={100} />
                  {data.reputation.lastIncident && (
                    <p className={styles.playerEmpty}>
                      {t.playerPanel.profile.lastIncident(
                        data.reputation.lastIncident.characterName,
                        incidentLabels[data.reputation.lastIncident.tag] ?? data.reputation.lastIncident.tag,
                      )}
                    </p>
                  )}
                  {data.reputation.lastPraise && (
                    <p className={styles.playerEmpty}>
                      {t.playerPanel.profile.lastPraise(
                        data.reputation.lastPraise.characterName,
                        praiseLabels[data.reputation.lastPraise.tag] ?? data.reputation.lastPraise.tag,
                      )}
                    </p>
                  )}
                </div>
                <form className={styles.playerForm} onSubmit={saveProfile}>
                  <label>
                    <span>{t.playerPanel.profile.nicknameLabel}</span>
                    <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={24} />
                  </label>
                  <PressableButton type="submit" tone="primary">{t.playerPanel.profile.saveNicknameButton}</PressableButton>
                  {profileStatus && <p>{profileStatus}</p>}
                </form>
                <div className={styles.playerHeroCard}>
                  <RotateCcw aria-hidden />
                  <div>
                    <span>{t.playerPanel.profile.resetCard.label}</span>
                    <strong>{t.playerPanel.profile.resetCard.title}</strong>
                    <p>{t.playerPanel.profile.resetCard.description}</p>
                  </div>
                </div>
                <PressableButton tone="secondary" onClick={resetGame} disabled={resettingGame}>{t.playerPanel.profile.resetButton}</PressableButton>
                {accountStatus && <p>{accountStatus}</p>}
              </div>
            )}

            {activeTab === "wallet" && (
              <div className={styles.playerSection}>
                <div className={styles.playerHeroCard}>
                  <ShoppingBag aria-hidden />
                  <div>
                    <span>{t.playerPanel.wallet.heroLabel}</span>
                    <strong>{billing ? t.playerPanel.wallet.paidCount(billing.paidRemaining) : t.playerPanel.wallet.loading}</strong>
                    <p>{t.playerPanel.wallet.description}</p>
                  </div>
                </div>

                <div className={styles.playerStatsGrid}>
                  <StatCard label={t.playerPanel.wallet.stats.paidRemaining} value={billing?.paidRemaining ?? "—"} />
                  <StatCard
                    label={t.playerPanel.wallet.stats.freeMonthly}
                    value={billing ? `${billing.free.remaining}/${billing.free.limit}` : "—"}
                  />
                  <StatCard label={t.playerPanel.wallet.stats.freeUsed} value={billing ? billing.free.used : "—"} />
                  <StatCard
                    label={t.playerPanel.wallet.stats.totalNow}
                    value={billing ? billing.paidRemaining + billing.free.remaining : "—"}
                  />
                </div>

                <PressableButton tone="primary" onClick={() => setAttemptShopOpen(true)}>
                  {t.playerPanel.wallet.buyButton}
                </PressableButton>

                {billingError && <div className={styles.playerEmpty}>{billingError}</div>}

                <div className={styles.playerTable}>
                  <div className={styles.playerTableHead}>
                    <span>{t.playerPanel.wallet.table.date}</span>
                    <span>{t.playerPanel.wallet.table.pack}</span>
                    <span>{t.playerPanel.wallet.table.attempts}</span>
                    <span>{t.playerPanel.wallet.table.status}</span>
                  </div>
                  {billing?.purchaseHistory.length ? billing.purchaseHistory.map((entry) => (
                    <div key={entry.id} className={styles.playerTableRow}>
                      <span>{formatDate(entry.createdAt, uiLocale)}</span>
                      <span>{entry.description}</span>
                      <span>+{entry.attempts}</span>
                      <span>{entry.status === "credited" ? t.playerPanel.wallet.creditedStatus : entry.status}</span>
                    </div>
                  )) : <div className={styles.playerEmpty}>{t.playerPanel.wallet.emptyHistory}</div>}
                </div>
              </div>
            )}

            {activeTab === "results" && (
              <div className={styles.playerSection}>
                <div className={styles.playerStatsGrid}>
                  <StatCard label={t.playerPanel.results.stats.attempts} value={data.summary.attemptsCount} />
                  <StatCard label={t.playerPanel.results.stats.wins} value={data.summary.completedAttemptsCount} />
                  <StatCard label={t.playerPanel.results.stats.failures} value={data.summary.failedAttemptsCount} />
                  <StatCard label={t.playerPanel.results.stats.abandoned} value={data.summary.abandonedAttemptsCount} />
                  <StatCard label={t.playerPanel.results.stats.averageTime} value={data.summary.averageTime} />
                  <StatCard label={t.playerPanel.results.stats.averageTurns} value={data.summary.averageTurns} />
                </div>
                <div className={styles.playerChartCard}>
                  <h3>{t.playerPanel.results.chartTitle}</h3>
                  {data.perLevel.map((level) => (
                    <MiniBar key={level.levelId} label={level.characterName} value={level.attemptsCount} max={maxAttempts} />
                  ))}
                </div>
                <div className={styles.playerTable}>
                  <div className={styles.playerTableHead}>
                    <span>{t.playerPanel.results.table.recent}</span>
                    <span>{t.playerPanel.results.table.character}</span>
                    <span>{t.playerPanel.results.table.status}</span>
                    <span>{t.playerPanel.results.table.time}</span>
                  </div>
                  {data.recentAttempts.length ? data.recentAttempts.map((attempt) => (
                    <div key={attempt.id} className={styles.playerTableRow}>
                      <span>{formatDate(attempt.startedAt, uiLocale)}</span>
                      <span>{attempt.characterName}</span>
                      <span>{statusLabels[attempt.status] ?? attempt.status}</span>
                      <span>{attempt.duration ?? "—"}</span>
                    </div>
                  )) : <div className={styles.playerEmpty}>{t.playerPanel.results.empty}</div>}
                </div>
              </div>
            )}

            {activeTab === "characters" && (
              <div className={styles.playerCharacterGrid}>
                {data.perLevel.map((level) => (
                  <article key={level.levelId} className={styles.playerCharacterCard}>
                    <div className={styles.playerCharacterHeader}>
                      <div>
                        <span>{t.playerPanel.characters.levelLabel(level.levelId, level.difficulty)}</span>
                        <h3>{level.characterName}</h3>
                      </div>
                      <strong>{level.successRate}%</strong>
                    </div>
                    <div className={styles.playerCharacterStats}>
                      <div><small>{t.playerPanel.characters.stats.attempts}</small><strong>{level.attemptsCount}</strong></div>
                      <div><small>{t.playerPanel.characters.stats.successRate}</small><strong>{level.successRate}%</strong></div>
                      <div><small>{t.playerPanel.characters.stats.record}</small><strong>{level.bestTime ?? "—"}</strong></div>
                      <div><small>{t.playerPanel.characters.stats.average}</small><strong>{level.averageTime ?? "—"}</strong></div>
                      <div><small>{t.playerPanel.characters.stats.turns}</small><strong>{level.averageTurns ?? "—"}</strong></div>
                    </div>
                    <div className={styles.playerBarTrack} aria-label={t.playerPanel.characters.successRateAriaLabel(level.successRate)}>
                      <i style={{ width: `${Math.max(0, level.successRate)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "settings" && (
              <div className={styles.playerSection}>
                <div className={styles.playerHeroCard}>
                  <Settings aria-hidden />
                  <div>
                    <span>{t.playerPanel.settings.heroLabel}</span>
                    <strong>{t.playerPanel.settings.title}</strong>
                    <p>{t.playerPanel.settings.description}</p>
                  </div>
                </div>
                <label className={styles.playerFormLabel}>
                  <span>{t.playerPanel.settings.conversationLanguageLabel}</span>
                  <select value={locale} onChange={(event) => saveLocale(event.target.value as Locale)}>
                    <option value="pl">{t.playerPanel.settings.localeOptions.pl}</option>
                    <option value="en">{t.playerPanel.settings.localeOptions.en}</option>
                  </select>
                </label>
                {localeStatus && <p className={styles.playerEmpty}>{localeStatus}</p>}
                <label className={styles.playerToggle}>
                  <span>{t.playerPanel.settings.music}</span>
                  <input type="checkbox" checked={audio.musicEnabled} onChange={(event) => audio.setMusicEnabled(event.target.checked)} />
                </label>
                <label className={styles.playerToggle}>
                  <span>{t.playerPanel.settings.sfx}</span>
                  <input type="checkbox" checked={audio.sfxEnabled} onChange={(event) => audio.setSfxEnabled(event.target.checked)} />
                </label>
                <label className={styles.playerToggle}>
                  <span>{t.playerPanel.settings.voice}</span>
                  <input type="checkbox" checked={audio.voiceEnabled} onChange={(event) => audio.setVoiceEnabled(event.target.checked)} />
                </label>
                <label className={styles.playerToggle}>
                  <span>{t.playerPanel.settings.mic}</span>
                  <input type="checkbox" checked={audio.sttEnabled} onChange={(event) => audio.setSttEnabled(event.target.checked)} />
                </label>
                <label className={styles.playerToggle}>
                  <span>{t.playerPanel.settings.autoSend}</span>
                  <input type="checkbox" checked={audio.sttAutoSend} onChange={(event) => audio.setSttAutoSend(event.target.checked)} />
                </label>
                <label className={styles.playerFormLabel}>
                  <span>{t.playerPanel.settings.volume}</span>
                  <input type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(event) => audio.setVolume(Number(event.target.value))} />
                </label>
                <label className={styles.playerFormLabel}>
                  <span>{t.playerPanel.settings.voiceVolume}</span>
                  <input type="range" min="0" max="1" step="0.05" value={audio.voiceVolume} onChange={(event) => audio.setVoiceVolume(Number(event.target.value))} />
                </label>
              </div>
            )}

            {activeTab === "account" && (
              <div className={styles.playerSection}>
                <div className={styles.playerHeroCard}>
                  <KeyRound aria-hidden />
                  <div>
                    <span>{t.playerPanel.account.heroLabel}</span>
                    <strong>{t.playerPanel.account.title}</strong>
                    <p>{t.playerPanel.account.description}</p>
                  </div>
                </div>
                <form className={styles.playerForm} onSubmit={changePassword}>
                  <label>
                    <span>{t.playerPanel.account.newPasswordLabel}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={6}
                      autoComplete="new-password"
                      placeholder={t.playerPanel.account.newPasswordPlaceholder}
                    />
                  </label>
                  <PressableButton type="submit" tone="primary" disabled={password.length < 6}>{t.playerPanel.account.changePasswordButton}</PressableButton>
                  {passwordStatus && <p>{passwordStatus}</p>}
                </form>
                <PressableButton tone="secondary" onClick={signOut}>{t.playerPanel.account.signOutButton}</PressableButton>
              </div>
            )}
          </div>
        )}
      </section>
      {attemptShopOpen && (
        <AttemptPurchaseModal
          levelId={1}
          title={t.playerPanel.wallet.shopTitle}
          description={t.playerPanel.wallet.shopDescription}
          onClose={() => setAttemptShopOpen(false)}
        />
      )}
    </div>
  );
}
