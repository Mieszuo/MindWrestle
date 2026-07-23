export function envInt(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

export function freeAttemptLimitPerMonth() {
  return envInt("FREE_ATTEMPTS_PER_MONTH", 3);
}

export function maxUserMessagesPerAttempt() {
  return envInt("MAX_USER_MESSAGES_PER_ATTEMPT", 25);
}

export function billingPeriodKey(date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mindwrestle.com").replace(/\/$/, "");
}
