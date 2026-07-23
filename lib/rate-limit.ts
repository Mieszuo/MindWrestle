type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitWindow>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { limited: false, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 60_000).unref();
