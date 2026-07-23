import type { SupabaseClient } from "@supabase/supabase-js";

import { billingPeriodKey, freeAttemptLimitPerMonth } from "@/lib/billing/config";
import { localeFromProfileSettings, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import type { AttemptRow } from "@/lib/game/engine/db-types";
import type { Database, Json } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export class NoAttemptCreditsError extends Error {
  freeRemaining: number;
  paidRemaining: number;

  constructor(details: { freeRemaining: number; paidRemaining: number }) {
    super("NO_ATTEMPTS_LEFT");
    this.name = "NoAttemptCreditsError";
    this.freeRemaining = details.freeRemaining;
    this.paidRemaining = details.paidRemaining;
  }
}

export interface AttemptEntitlements {
  periodKey: string;
  paidRemaining: number;
  free: { limit: number; used: number; remaining: number };
  purchaseHistory: Array<{
    id: string;
    attempts: number;
    description: string;
    createdAt: string;
    status: "credited";
  }>;
  unavailable?: boolean;
}

// Used as a resilience fallback when billing data couldn't be loaded at all (see
// app/api/billing/entitlements/route.ts). The locale parameter is kept for API
// stability even though the empty payload is currently locale-independent.
export function emptyAttemptEntitlements(_locale: Locale = "en"): AttemptEntitlements {
  return {
    periodKey: billingPeriodKey(),
    paidRemaining: 0,
    free: freeSummary(0),
    purchaseHistory: [],
    unavailable: true,
  };
}

export async function getAttemptEntitlements(supabase: Db, userId: string): Promise<AttemptEntitlements> {
  const periodKey = billingPeriodKey();
  const [walletResult, freeLedgerResult, purchaseLedgerResult, profileResult] = await Promise.all([
    supabase.from("user_attempt_wallets").select("paid_attempts_balance").eq("user_id", userId).maybeSingle(),
    supabase
      .from("attempt_ledger")
      .select("level_id, amount")
      .eq("user_id", userId)
      .eq("source", "free_monthly")
      .eq("period_key", periodKey)
      .lt("amount", 0),
    supabase
      .from("attempt_ledger")
      .select("id, amount, description, created_at")
      .eq("user_id", userId)
      .eq("source", "paid_pack")
      .gt("amount", 0)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("settings").eq("id", userId).maybeSingle(),
  ]);

  if (walletResult.error) throw new Error(walletResult.error.message);
  if (freeLedgerResult.error) throw new Error(freeLedgerResult.error.message);
  if (purchaseLedgerResult.error) throw new Error(purchaseLedgerResult.error.message);

  const locale: Locale = localeFromProfileSettings(profileResult.data?.settings) ?? "en";
  const dictionary = getDictionary(locale);

  let freeUsed = 0;
  for (const row of freeLedgerResult.data ?? []) {
    freeUsed += Math.abs(row.amount);
  }

  return {
    periodKey,
    paidRemaining: walletResult.data?.paid_attempts_balance ?? 0,
    free: freeSummary(freeUsed),
    purchaseHistory: (purchaseLedgerResult.data ?? []).map((entry) => ({
      id: entry.id,
      attempts: entry.amount,
      description: entry.description ?? dictionary.billing.packFallback(entry.amount),
      createdAt: entry.created_at,
      status: "credited",
    })),
  };
}

function freeSummary(used: number) {
  const limit = freeAttemptLimitPerMonth();
  return { limit, used, remaining: Math.max(limit - used, 0) };
}

export async function consumeAttemptCredit(supabase: Db, userId: string, levelId: number) {
  const { data, error } = await supabase.rpc("consume_attempt_credit", {
    p_user_id: userId,
    p_level_id: levelId,
    p_period_key: billingPeriodKey(),
    p_free_limit: freeAttemptLimitPerMonth(),
  });

  if (error) throw new Error(error.message);
  const result = data?.[0];
  if (!result?.allowed) {
    throw new NoAttemptCreditsError({
      freeRemaining: result?.free_remaining ?? 0,
      paidRemaining: result?.paid_remaining ?? 0,
    });
  }

  return {
    source: result.source ?? "paid_pack",
    ledgerId: result.ledger_id,
    freeRemaining: result.free_remaining,
    paidRemaining: result.paid_remaining,
  };
}

export interface CreateAttemptParams {
  levelId: number;
  progressId: string;
  emotionState: Json;
  reputationSession: Json;
  reputationContext: Json;
  psychState: Json | null;
  now: string;
}

export interface CreatedAttempt {
  attempt: AttemptRow;
  source: string;
  freeRemaining: number;
  paidRemaining: number;
}

// Atomically consume an attempt credit AND create the attempt row in a single
// transaction (see the `start_attempt_atomic` RPC). Consuming the credit before
// the row existed meant a failed INSERT silently burned a paid/free attempt; the
// RPC rolls the credit back with the row, so a failure never costs the player.
export async function createAttemptWithCredit(
  supabase: Db,
  userId: string,
  params: CreateAttemptParams,
): Promise<CreatedAttempt> {
  const { data, error } = await supabase.rpc("start_attempt_atomic", {
    p_user_id: userId,
    p_level_id: params.levelId,
    p_period_key: billingPeriodKey(),
    p_free_limit: freeAttemptLimitPerMonth(),
    p_emotion_state: params.emotionState,
    p_reputation_session: params.reputationSession,
    p_reputation_context: params.reputationContext,
    p_psych_state: params.psychState,
    p_progress_id: params.progressId,
    p_now: params.now,
  });

  if (error) throw new Error(error.message);

  const result = data?.[0];
  if (!result?.allowed || !result.attempt) {
    throw new NoAttemptCreditsError({
      freeRemaining: result?.free_remaining ?? 0,
      paidRemaining: result?.paid_remaining ?? 0,
    });
  }

  return {
    attempt: result.attempt as AttemptRow,
    source: result.source ?? "paid_pack",
    freeRemaining: result.free_remaining,
    paidRemaining: result.paid_remaining,
  };
}

export async function attachAttemptLedgerEntry(supabase: Db, userId: string, ledgerId: string | null, attemptId: string) {
  if (!ledgerId) return;
  const { error } = await supabase.rpc("attach_attempt_ledger", {
    p_user_id: userId,
    p_ledger_id: ledgerId,
    p_attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
}
