# Billing P0 Fixes (Etap 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the three P0 billing defects from the 2026-07-20 audit: price↔pack mismatch (40-pack sells as 5-pack), missing async-payment/refund/dispute webhook handling, and the TTS/STT endpoints usable as an unmetered ElevenLabs proxy.

**Architecture:** Pure decision logic goes into small testable modules (`lib/billing/pack-validation.ts`, `lib/billing/webhook-actions.ts`, `lib/voice/attempt-guard.server.ts`); Stripe/Supabase wiring stays thin in `stripe.server.ts` and the route handlers. Refunds, freezes and daily voice quotas are enforced in Postgres (idempotent `security definer` functions, same pattern as the existing `credit_paid_attempt_pack`).

**Tech Stack:** Next.js 16.2.9 (custom fork — read `node_modules/next/dist/docs/01-app/...` route-handler guide before editing routes), Stripe SDK 22 (`apiVersion: "2026-06-24.dahlia"`), Supabase (Postgres + RLS), Zod 4, Vitest 4.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-20-payment-model-audit-design.md` §6 Etap 1 only. NIE wdrażamy Etapu 2/3 (konsumpcja przy pierwszej wiadomości, budżet głosu per próba, wycena cost_usd — później).
- Production Supabase is DOWN (project deleted/paused). Migrations are file-only for now; verification = `npx tsc --noEmit` + `npm test` (vitest) + `npm run lint`. SQL gets applied during Etap 0 (DB restore).
- Follow existing repo route conventions: `requireAuth()` from `lib/supabase/api-auth`, `NextResponse.json`, Zod `validateBody`, `context.params` is a `Promise`.
- NPC message role in `conversation_messages` is `"CHARACTER"`; attempt status in play is `"IN_PROGRESS"`.
- Pack prices (display + expected Stripe amounts): attempts_5 = €2.99/299¢, attempts_15 = €6.99/699¢, attempts_40 = €14.99/1499¢, currency `eur`.
- Keep the in-memory `rateLimit()` calls as a fast-path; the durable quota is additive, not a replacement.
- Commit after each task. Branch: `billing-p0-fixes` (create via superpowers:using-git-worktrees at execution start).
- `lib/supabase/database.types.ts` is hand-maintained here (no live DB to regenerate from) — mirror the style of existing entries exactly.

---

### Task 1: Pack ↔ price cross-validation

**Files:**
- Modify: `lib/billing/config.ts` (add `amountCents`, `currency` to `ATTEMPT_PACKS`)
- Create: `lib/billing/pack-validation.ts`
- Create: `lib/billing/__tests__/pack-validation.test.ts`
- Modify: `lib/billing/stripe.server.ts` (wire into checkout creation + fulfillment)

**Interfaces:**
- Consumes: `ATTEMPT_PACKS`, `AttemptPackId` from `lib/billing/config`.
- Produces: `assertPackPriceMatches(packId: AttemptPackId, price: { unitAmount: number | null; currency: string | null }): void` (throws `PackPriceMismatchError`), `resolveFulfillmentPackId(metadataPackId: string | null | undefined, lineItemPackId: AttemptPackId | null): AttemptPackId | null`. Task 3 relies on fulfillment continuing to return `{ processed, reason, attempts? }`.

- [ ] **Step 1: Write the failing test**

`lib/billing/__tests__/pack-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  assertPackPriceMatches,
  PackPriceMismatchError,
  resolveFulfillmentPackId,
} from "@/lib/billing/pack-validation";

describe("assertPackPriceMatches", () => {
  it("accepts the exact configured amount and currency", () => {
    expect(() =>
      assertPackPriceMatches("attempts_5", { unitAmount: 299, currency: "eur" }),
    ).not.toThrow();
  });

  it("rejects a wrong amount (40-pack pointing at the 5-pack price)", () => {
    expect(() =>
      assertPackPriceMatches("attempts_40", { unitAmount: 299, currency: "eur" }),
    ).toThrow(PackPriceMismatchError);
  });

  it("rejects a wrong currency", () => {
    expect(() =>
      assertPackPriceMatches("attempts_5", { unitAmount: 299, currency: "usd" }),
    ).toThrow(PackPriceMismatchError);
  });

  it("rejects a price with missing amount", () => {
    expect(() =>
      assertPackPriceMatches("attempts_5", { unitAmount: null, currency: "eur" }),
    ).toThrow(PackPriceMismatchError);
  });
});

describe("resolveFulfillmentPackId", () => {
  it("returns the line-item pack when metadata agrees", () => {
    expect(resolveFulfillmentPackId("attempts_15", "attempts_15")).toBe("attempts_15");
  });

  it("returns the line-item pack when metadata is absent", () => {
    expect(resolveFulfillmentPackId(undefined, "attempts_5")).toBe("attempts_5");
    expect(resolveFulfillmentPackId(null, "attempts_5")).toBe("attempts_5");
  });

  it("returns null when metadata and line item disagree", () => {
    expect(resolveFulfillmentPackId("attempts_40", "attempts_5")).toBeNull();
  });

  it("returns null when no line-item pack was recognized", () => {
    expect(resolveFulfillmentPackId("attempts_5", null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/billing/__tests__/pack-validation.test.ts`
Expected: FAIL — cannot resolve `@/lib/billing/pack-validation`.

- [ ] **Step 3: Add expected amounts to config**

In `lib/billing/config.ts`, extend the record type and each entry (keep existing fields verbatim):

```ts
export const ATTEMPT_PACKS: Record<
  AttemptPackId,
  {
    attempts: number;
    label: string;
    displayPrice: string;
    amountCents: number;
    currency: "eur";
    description: string;
    priceEnv: string;
  }
> = {
  attempts_5: {
    attempts: 5,
    label: "5 podejść",
    displayPrice: "€2.99",
    amountCents: 299,
    currency: "eur",
    description: "Mały zapas szans na kolejne rozmowy.",
    priceEnv: "STRIPE_PRICE_ATTEMPTS_5",
  },
  attempts_15: {
    attempts: 15,
    label: "15 podejść",
    displayPrice: "€6.99",
    amountCents: 699,
    currency: "eur",
    description: "Najrozsądniejszy pakiet do przejścia mapy.",
    priceEnv: "STRIPE_PRICE_ATTEMPTS_15",
  },
  attempts_40: {
    attempts: 40,
    label: "40 podejść",
    displayPrice: "€14.99",
    amountCents: 1499,
    currency: "eur",
    description: "Duży zapas dla prób, rankingów i powrotów.",
    priceEnv: "STRIPE_PRICE_ATTEMPTS_40",
  },
};
```

- [ ] **Step 4: Implement `lib/billing/pack-validation.ts`**

```ts
import { ATTEMPT_PACKS, type AttemptPackId } from "@/lib/billing/config";

export class PackPriceMismatchError extends Error {
  constructor(packId: AttemptPackId, expected: string, actual: string) {
    super(`Stripe price mismatch for ${packId}: expected ${expected}, got ${actual}`);
    this.name = "PackPriceMismatchError";
  }
}

export interface StripePriceSummary {
  unitAmount: number | null;
  currency: string | null;
}

export function assertPackPriceMatches(packId: AttemptPackId, price: StripePriceSummary) {
  const pack = ATTEMPT_PACKS[packId];
  const matches =
    price.unitAmount === pack.amountCents && price.currency?.toLowerCase() === pack.currency;
  if (!matches) {
    throw new PackPriceMismatchError(
      packId,
      `${pack.amountCents} ${pack.currency}`,
      `${price.unitAmount ?? "?"} ${price.currency ?? "?"}`,
    );
  }
}

export function resolveFulfillmentPackId(
  metadataPackId: string | null | undefined,
  lineItemPackId: AttemptPackId | null,
): AttemptPackId | null {
  if (!lineItemPackId) return null;
  if (metadataPackId && metadataPackId !== lineItemPackId) return null;
  return lineItemPackId;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/billing/__tests__/pack-validation.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Wire into `stripe.server.ts`**

In `createAttemptPackCheckout`, after `const customerId = await getOrCreateCustomer(user);` and before `stripe.checkout.sessions.create`, verify the configured price object matches what the UI advertises:

```ts
  const priceId = priceIdForPack(packId);
  const price = await stripe.prices.retrieve(priceId);
  assertPackPriceMatches(packId, { unitAmount: price.unit_amount, currency: price.currency });
```

Use `line_items: [{ price: priceId, quantity: 1 }]` (reuse the fetched id). Import `assertPackPriceMatches` and `resolveFulfillmentPackId` from `@/lib/billing/pack-validation`.

In `fulfillAttemptPackCheckout`, replace the pack resolution block:

```ts
  const lineItemPack = await packForCheckoutSessionLineItem(session.id);
  const packId = resolveFulfillmentPackId(session.metadata?.packId, lineItemPack?.id ?? null);
  if (!packId) {
    console.error("Attempt pack fulfillment mismatch", {
      sessionId: session.id,
      metadataPackId: session.metadata?.packId ?? null,
      lineItemPackId: lineItemPack?.id ?? null,
    });
    return { processed: false, reason: lineItemPack ? "pack_mismatch" : "unrecognized_line_item" };
  }
  const pack = { id: packId, ...ATTEMPT_PACKS[packId] };
```

(`ATTEMPT_PACKS` is already imported in this file.) The rest of the function (rpc `credit_paid_attempt_pack`) stays unchanged.

- [ ] **Step 7: Verify types and full suite**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm test` — expected: all suites PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/billing/config.ts lib/billing/pack-validation.ts lib/billing/__tests__/pack-validation.test.ts lib/billing/stripe.server.ts
git commit -m "fix(billing): cross-validate attempt pack against Stripe price at checkout and fulfillment"
```

---

### Task 2: Migration — adjustments, wallet freeze, voice quotas

**Files:**
- Create: `supabase/migrations/20260720000000_billing_adjustments_freeze_quotas.sql`
- Modify: `lib/supabase/database.types.ts` (wallet `frozen_at`, new table `voice_usage_quotas`, 3 new functions)

**Interfaces:**
- Produces (used by Tasks 3–5): RPC `apply_billing_adjustment(p_user_id uuid, p_amount int, p_stripe_event_id text, p_event_type text, p_payload jsonb, p_description text) → boolean` (service_role), RPC `freeze_attempt_wallet(p_user_id uuid, p_stripe_event_id text, p_event_type text, p_payload jsonb) → boolean` (service_role), RPC `consume_voice_quota(p_user_id uuid, p_tts_chars int, p_stt_requests int, p_tts_daily_limit int, p_stt_daily_limit int) → table(allowed bool, tts_used int, stt_used int)` (authenticated).

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260720000000_billing_adjustments_freeze_quotas.sql`:

```sql
-- Billing P0: refund adjustments, dispute wallet freeze, durable daily voice quotas.

alter table public.user_attempt_wallets
  add column if not exists frozen_at timestamptz;

-- Idempotent (by stripe_event_id) wallet adjustment used for refunds and manual corrections.
-- Negative amounts never drive the balance below zero; the ledger records what was applied.
create or replace function public.apply_billing_adjustment(
  p_user_id uuid,
  p_amount integer,
  p_stripe_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_description text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_balance integer;
  v_applied integer;
begin
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into public.billing_events (stripe_event_id, event_type, user_id, payload)
  values (p_stripe_event_id, p_event_type, p_user_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.user_attempt_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select paid_attempts_balance into v_balance
  from public.user_attempt_wallets
  where user_id = p_user_id
  for update;

  v_applied := case
    when p_amount < 0 then -least(v_balance, -p_amount)
    else p_amount
  end;

  if v_applied <> 0 then
    update public.user_attempt_wallets
    set paid_attempts_balance = paid_attempts_balance + v_applied,
        updated_at = now()
    where user_id = p_user_id;

    insert into public.attempt_ledger (user_id, source, amount, stripe_event_id, description)
    values (p_user_id, 'adjustment', v_applied, p_stripe_event_id, p_description);
  end if;

  return true;
end;
$$;

revoke execute on function public.apply_billing_adjustment(uuid, integer, text, text, jsonb, text) from public;
grant execute on function public.apply_billing_adjustment(uuid, integer, text, text, jsonb, text) to service_role;

-- Idempotent freeze on dispute; frozen wallets cannot consume attempts (any source).
create or replace function public.freeze_attempt_wallet(
  p_user_id uuid,
  p_stripe_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.billing_events (stripe_event_id, event_type, user_id, payload)
  values (p_stripe_event_id, p_event_type, p_user_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.user_attempt_wallets (user_id, frozen_at)
  values (p_user_id, now())
  on conflict (user_id) do update set
    frozen_at = coalesce(public.user_attempt_wallets.frozen_at, now()),
    updated_at = now();

  return true;
end;
$$;

revoke execute on function public.freeze_attempt_wallet(uuid, text, text, jsonb) from public;
grant execute on function public.freeze_attempt_wallet(uuid, text, text, jsonb) to service_role;

-- Recreate consume_attempt_credit with a frozen-wallet gate (signature unchanged).
create or replace function public.consume_attempt_credit(
  p_user_id uuid,
  p_level_id integer,
  p_period_key text,
  p_free_limit integer
)
returns table (
  allowed boolean,
  source text,
  ledger_id uuid,
  free_remaining integer,
  paid_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.user_attempt_wallets%rowtype;
  v_free_used integer := 0;
  v_ledger_id uuid;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.user_attempt_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.user_attempt_wallets
  where user_id = p_user_id
  for update;

  if p_free_limit > 0 then
    select coalesce(sum(-amount), 0)::integer into v_free_used
    from public.attempt_ledger
    where user_id = p_user_id
      and source = 'free_monthly'
      and period_key = p_period_key
      and amount < 0;
  end if;

  if v_wallet.frozen_at is not null then
    return query select false, null::text, null::uuid,
      greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance;
    return;
  end if;

  if p_free_limit > 0 and v_free_used < p_free_limit then
    insert into public.attempt_ledger (user_id, level_id, source, amount, period_key, description)
    values (p_user_id, p_level_id, 'free_monthly', -1, p_period_key, 'Monthly free attempt')
    returning id into v_ledger_id;

    return query select true, 'free_monthly'::text, v_ledger_id,
      greatest(p_free_limit - v_free_used - 1, 0), v_wallet.paid_attempts_balance;
    return;
  end if;

  if v_wallet.paid_attempts_balance > 0 then
    update public.user_attempt_wallets
    set paid_attempts_balance = paid_attempts_balance - 1,
        updated_at = now()
    where user_id = p_user_id
    returning * into v_wallet;

    insert into public.attempt_ledger (user_id, level_id, source, amount, period_key, description)
    values (p_user_id, p_level_id, 'paid_pack', -1, p_period_key, 'Paid package attempt')
    returning id into v_ledger_id;

    return query select true, 'paid_pack'::text, v_ledger_id,
      greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance;
    return;
  end if;

  return query select false, null::text, null::uuid,
    greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance;
end;
$$;

revoke execute on function public.consume_attempt_credit(uuid, integer, text, integer) from public;
grant execute on function public.consume_attempt_credit(uuid, integer, text, integer) to authenticated;

-- Durable per-day voice quotas (UTC day), enforced server-side per user.
create table if not exists public.voice_usage_quotas (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  tts_chars integer not null default 0 check (tts_chars >= 0),
  stt_requests integer not null default 0 check (stt_requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.voice_usage_quotas enable row level security;

create policy "Users can view own voice quotas"
  on public.voice_usage_quotas for select
  using ((select auth.uid()) = user_id);

create or replace function public.consume_voice_quota(
  p_user_id uuid,
  p_tts_chars integer,
  p_stt_requests integer,
  p_tts_daily_limit integer,
  p_stt_daily_limit integer
)
returns table (allowed boolean, tts_used integer, stt_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_row public.voice_usage_quotas%rowtype;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not authorized';
  end if;
  if p_tts_chars < 0 or p_stt_requests < 0 then
    raise exception 'usage must be non-negative';
  end if;

  insert into public.voice_usage_quotas (user_id, usage_date)
  values (p_user_id, v_day)
  on conflict (user_id, usage_date) do nothing;

  select * into v_row
  from public.voice_usage_quotas
  where user_id = p_user_id and usage_date = v_day
  for update;

  if v_row.tts_chars + p_tts_chars > p_tts_daily_limit
     or v_row.stt_requests + p_stt_requests > p_stt_daily_limit then
    return query select false, v_row.tts_chars, v_row.stt_requests;
    return;
  end if;

  update public.voice_usage_quotas
  set tts_chars = tts_chars + p_tts_chars,
      stt_requests = stt_requests + p_stt_requests,
      updated_at = now()
  where user_id = p_user_id and usage_date = v_day;

  return query select true, v_row.tts_chars + p_tts_chars, v_row.stt_requests + p_stt_requests;
end;
$$;

revoke execute on function public.consume_voice_quota(uuid, integer, integer, integer, integer) from public;
grant execute on function public.consume_voice_quota(uuid, integer, integer, integer, integer) to authenticated;
```

- [ ] **Step 2: Update `lib/supabase/database.types.ts`**

Open the file, locate the `user_attempt_wallets` table entry and the `Functions` section (search for `credit_paid_attempt_pack` to see the exact house style). Make these edits, mirroring surrounding formatting exactly:

1. `user_attempt_wallets` Row/Insert/Update: add `frozen_at: string | null;` (Row) and `frozen_at?: string | null;` (Insert, Update).
2. New table entry `voice_usage_quotas` alongside the other tables:

```ts
      voice_usage_quotas: {
        Row: {
          user_id: string;
          usage_date: string;
          tts_chars: number;
          stt_requests: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          usage_date: string;
          tts_chars?: number;
          stt_requests?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          usage_date?: string;
          tts_chars?: number;
          stt_requests?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
```

3. New `Functions` entries (match the Args/Returns style of `credit_paid_attempt_pack`):

```ts
      apply_billing_adjustment: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_stripe_event_id: string;
          p_event_type: string;
          p_payload: Json;
          p_description: string;
        };
        Returns: boolean;
      };
      freeze_attempt_wallet: {
        Args: {
          p_user_id: string;
          p_stripe_event_id: string;
          p_event_type: string;
          p_payload: Json;
        };
        Returns: boolean;
      };
      consume_voice_quota: {
        Args: {
          p_user_id: string;
          p_tts_chars: number;
          p_stt_requests: number;
          p_tts_daily_limit: number;
          p_stt_daily_limit: number;
        };
        Returns: {
          allowed: boolean;
          tts_used: number;
          stt_used: number;
        }[];
      };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm test` — expected: PASS (no behavior change yet).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260720000000_billing_adjustments_freeze_quotas.sql lib/supabase/database.types.ts
git commit -m "feat(billing): add refund adjustments, dispute wallet freeze and daily voice quotas (migration)"
```

---

### Task 3: Webhook — async payments, refunds, disputes

**Files:**
- Create: `lib/billing/webhook-actions.ts`
- Create: `lib/billing/__tests__/webhook-actions.test.ts`
- Modify: `lib/billing/stripe.server.ts` (add `handleChargeRefunded`, `handleDisputeCreated`)
- Modify: `app/api/billing/webhook/route.ts` (event routing)

**Interfaces:**
- Consumes: Task 2 RPCs `apply_billing_adjustment`, `freeze_attempt_wallet`; existing `packForCheckoutSessionLineItem`, `createServiceRoleClient`, `getStripe`.
- Produces: `deriveRefundAction(charge: Pick<Stripe.Charge, "refunded" | "amount" | "amount_refunded">): RefundAction`; `handleChargeRefunded(event, charge)` and `handleDisputeCreated(event, dispute)` both return `{ processed: boolean; reason: string; attempts?: number }`.

- [ ] **Step 1: Write the failing test**

`lib/billing/__tests__/webhook-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { deriveRefundAction } from "@/lib/billing/webhook-actions";

describe("deriveRefundAction", () => {
  it("treats a fully refunded charge as full_refund", () => {
    expect(deriveRefundAction({ refunded: true, amount: 699, amount_refunded: 699 })).toEqual({
      type: "full_refund",
    });
  });

  it("treats amount_refunded >= amount as full_refund even without the flag", () => {
    expect(deriveRefundAction({ refunded: false, amount: 699, amount_refunded: 699 })).toEqual({
      type: "full_refund",
    });
  });

  it("treats a partial refund as partial_refund", () => {
    expect(deriveRefundAction({ refunded: false, amount: 699, amount_refunded: 100 })).toEqual({
      type: "partial_refund",
    });
  });

  it("ignores events with no refunded amount", () => {
    expect(deriveRefundAction({ refunded: false, amount: 699, amount_refunded: 0 })).toEqual({
      type: "ignore",
      reason: "no_amount_refunded",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/billing/__tests__/webhook-actions.test.ts`
Expected: FAIL — cannot resolve `@/lib/billing/webhook-actions`.

- [ ] **Step 3: Implement `lib/billing/webhook-actions.ts`**

```ts
import type Stripe from "stripe";

export type RefundAction =
  | { type: "full_refund" }
  | { type: "partial_refund" }
  | { type: "ignore"; reason: string };

export function deriveRefundAction(
  charge: Pick<Stripe.Charge, "refunded" | "amount" | "amount_refunded">,
): RefundAction {
  if (charge.amount_refunded <= 0) return { type: "ignore", reason: "no_amount_refunded" };
  if (charge.refunded || charge.amount_refunded >= charge.amount) return { type: "full_refund" };
  return { type: "partial_refund" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/billing/__tests__/webhook-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add handlers to `stripe.server.ts`**

Append at the end of `lib/billing/stripe.server.ts` (add `import { deriveRefundAction } from "@/lib/billing/webhook-actions";` at the top):

```ts
export async function handleChargeRefunded(event: Stripe.Event, charge: Stripe.Charge) {
  const action = deriveRefundAction(charge);
  if (action.type === "ignore") return { processed: false, reason: action.reason };

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return { processed: false, reason: "missing_payment_intent" };

  const sessions = await getStripe().checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
  const session = sessions.data[0];
  const userId = session?.metadata?.userId ?? session?.client_reference_id ?? null;
  const pack = session ? await packForCheckoutSessionLineItem(session.id) : null;

  if (!session || !userId || !pack) {
    console.error("Stripe refund without a recognizable attempt pack", {
      chargeId: charge.id,
      paymentIntentId,
    });
    return { processed: false, reason: "unmatched_refund" };
  }

  if (action.type === "partial_refund") {
    console.error("Partial refund requires manual review", {
      chargeId: charge.id,
      userId,
      packId: pack.id,
      amountRefunded: charge.amount_refunded,
    });
    return { processed: false, reason: "partial_refund_manual_review" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("apply_billing_adjustment", {
    p_user_id: userId,
    p_amount: -pack.attempts,
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_payload: event as unknown as Json,
    p_description: `Stripe refund: ${pack.label}`,
  });

  if (error) throw new Error(error.message);
  if (!data) return { processed: false, reason: "duplicate_event" };
  return { processed: true, reason: "refund_debited", attempts: -pack.attempts };
}

export async function handleDisputeCreated(event: Stripe.Event, dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return { processed: false, reason: "missing_charge" };

  const charge = await getStripe().charges.retrieve(chargeId);
  const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  if (!customerId) return { processed: false, reason: "missing_customer" };

  const supabase = createServiceRoleClient();
  const { data: customer, error } = await supabase
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!customer) return { processed: false, reason: "unknown_customer" };

  const { data, error: rpcError } = await supabase.rpc("freeze_attempt_wallet", {
    p_user_id: customer.user_id,
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_payload: event as unknown as Json,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!data) return { processed: false, reason: "duplicate_event" };
  return { processed: true, reason: "wallet_frozen" };
}
```

- [ ] **Step 6: Route events in `app/api/billing/webhook/route.ts`**

Replace the `try` body (keep signature verification above unchanged):

```ts
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const result = await fulfillAttemptPackCheckout(event, event.data.object as Stripe.Checkout.Session);
        return NextResponse.json({ received: true, ...result });
      }
      case "checkout.session.async_payment_failed":
        return NextResponse.json({ received: true, processed: false, reason: "async_payment_failed" });
      case "charge.refunded": {
        const result = await handleChargeRefunded(event, event.data.object as Stripe.Charge);
        return NextResponse.json({ received: true, ...result });
      }
      case "charge.dispute.created": {
        const result = await handleDisputeCreated(event, event.data.object as Stripe.Dispute);
        return NextResponse.json({ received: true, ...result });
      }
      default:
        return NextResponse.json({ received: true, processed: false, reason: "ignored_event" });
    }
  } catch (error) {
    ...unchanged catch block...
  }
```

Update the import: `import { fulfillAttemptPackCheckout, getStripe, getStripeWebhookSecret, handleChargeRefunded, handleDisputeCreated } from "@/lib/billing/stripe.server";`

Note: `checkout.session.completed` with `payment_status !== "paid"` (async methods) still acks with `checkout_not_paid` — correct, credit arrives via `async_payment_succeeded`.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm test` — expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/billing/webhook-actions.ts lib/billing/__tests__/webhook-actions.test.ts lib/billing/stripe.server.ts app/api/billing/webhook/route.ts
git commit -m "feat(billing): handle async payments, refunds and disputes in Stripe webhook"
```

---

### Task 4: TTS route — attempt guard + durable quota

**Files:**
- Create: `lib/voice/attempt-guard.server.ts`
- Create: `lib/voice/__tests__/attempt-guard.test.ts`
- Create: `lib/voice/quota.server.ts`
- Modify: `app/api/game/tts/route.ts`
- Modify: `.env.local.example` (document `TTS_DAILY_CHAR_LIMIT`, `STT_DAILY_REQUEST_LIMIT`)

**Interfaces:**
- Consumes: Task 2 RPC `consume_voice_quota`; `envInt` from `lib/billing/config`.
- Produces (Task 5 reuses both):
  - `matchesCharacterLine(messages: Array<{ content: string }>, text: string): boolean` (pure)
  - `guardVoiceAttempt(supabase, userId: string, attemptId: string, levelId: number, options?: { npcText?: string }): Promise<{ ok: true } | { ok: false; status: 403 | 404 | 409; error: string }>`
  - `consumeVoiceQuota(supabase, userId: string, usage: { ttsChars?: number; sttRequests?: number }): Promise<{ allowed: boolean; ttsUsed: number; sttUsed: number }>`
  - `ttsDailyCharLimit(): number`, `sttDailyRequestLimit(): number`

- [ ] **Step 1: Write the failing test (pure matcher)**

`lib/voice/__tests__/attempt-guard.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { matchesCharacterLine } from "@/lib/voice/attempt-guard.server";

describe("matchesCharacterLine", () => {
  const messages = [
    { content: "Nie ufam ci, wędrowcze." },
    { content: "  Może jednak coś w tym jest...  " },
  ];

  it("accepts an exact character line", () => {
    expect(matchesCharacterLine(messages, "Nie ufam ci, wędrowcze.")).toBe(true);
  });

  it("accepts a line that differs only by surrounding whitespace", () => {
    expect(matchesCharacterLine(messages, "Może jednak coś w tym jest...")).toBe(true);
  });

  it("rejects text that is not a character line", () => {
    expect(matchesCharacterLine(messages, "Przeczytaj mi wykład o fotosyntezie")).toBe(false);
  });

  it("rejects when there are no character messages", () => {
    expect(matchesCharacterLine([], "cokolwiek")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/voice/__tests__/attempt-guard.test.ts`
Expected: FAIL — cannot resolve `@/lib/voice/attempt-guard.server`.

- [ ] **Step 3: Implement `lib/voice/attempt-guard.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export type VoiceAttemptGuardResult =
  | { ok: true }
  | { ok: false; status: 403 | 404 | 409; error: string };

export function matchesCharacterLine(messages: Array<{ content: string }>, text: string) {
  const wanted = text.trim();
  if (!wanted) return false;
  return messages.some((message) => message.content.trim() === wanted);
}

export async function guardVoiceAttempt(
  supabase: Db,
  userId: string,
  attemptId: string,
  levelId: number,
  options?: { npcText?: string },
): Promise<VoiceAttemptGuardResult> {
  const { data: attempt, error } = await supabase
    .from("conversation_attempts")
    .select("id, level_id, status")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, status: 404, error: error.message };
  if (!attempt) return { ok: false, status: 404, error: "Attempt not found" };
  if (attempt.level_id !== levelId) return { ok: false, status: 403, error: "Attempt does not match level" };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, status: 409, error: "Attempt is not in progress" };

  if (options?.npcText !== undefined) {
    const { data: messages, error: messagesError } = await supabase
      .from("conversation_messages")
      .select("content")
      .eq("attempt_id", attemptId)
      .eq("role", "CHARACTER")
      .order("created_at", { ascending: false })
      .limit(20);

    if (messagesError) return { ok: false, status: 404, error: messagesError.message };
    if (!matchesCharacterLine(messages ?? [], options.npcText)) {
      return { ok: false, status: 403, error: "Text is not a character line from this attempt" };
    }
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/voice/__tests__/attempt-guard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement `lib/voice/quota.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { envInt } from "@/lib/billing/config";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export function ttsDailyCharLimit() {
  return envInt("TTS_DAILY_CHAR_LIMIT", 40_000);
}

export function sttDailyRequestLimit() {
  return envInt("STT_DAILY_REQUEST_LIMIT", 200);
}

export async function consumeVoiceQuota(
  supabase: Db,
  userId: string,
  usage: { ttsChars?: number; sttRequests?: number },
) {
  const { data, error } = await supabase.rpc("consume_voice_quota", {
    p_user_id: userId,
    p_tts_chars: usage.ttsChars ?? 0,
    p_stt_requests: usage.sttRequests ?? 0,
    p_tts_daily_limit: ttsDailyCharLimit(),
    p_stt_daily_limit: sttDailyRequestLimit(),
  });

  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { allowed: Boolean(row?.allowed), ttsUsed: row?.tts_used ?? 0, sttUsed: row?.stt_used ?? 0 };
}
```

- [ ] **Step 6: Harden `app/api/game/tts/route.ts`**

1. Schema: change `attemptId: z.string().optional()` → `attemptId: z.string().uuid()` (required).
2. After the `rateLimit` check and body validation, before any profile/DB work, add:

```ts
  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, body.attemptId, levelId, {
    npcText: text,
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { ttsChars: text.length });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Dzienny limit głosu wyczerpany. Wróć jutro albo graj z napisami." },
      { status: 429 },
    );
  }
```

3. Imports: `import { guardVoiceAttempt } from "@/lib/voice/attempt-guard.server";` and `import { consumeVoiceQuota } from "@/lib/voice/quota.server";`
4. In both `logAiUsage` calls `attemptId: body.attemptId` (no `?? null` needed anymore).

Client compatibility: the only call site (`hooks/use-character-voice.ts` → `components/game/conversation-parchment.tsx:374`) always sends `attemptId: snapshot.id` and the exact `lastCharacterMessage.content` — no client change needed.

- [ ] **Step 7: Document envs in `.env.local.example`**

Add under the ElevenLabs block:

```
# Daily per-user voice budgets (server-enforced, UTC day)
TTS_DAILY_CHAR_LIMIT=40000
STT_DAILY_REQUEST_LIMIT=200
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm test` — expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/voice/attempt-guard.server.ts lib/voice/__tests__/attempt-guard.test.ts lib/voice/quota.server.ts app/api/game/tts/route.ts .env.local.example
git commit -m "fix(voice): validate attempt ownership and NPC text, enforce durable daily TTS quota"
```

---

### Task 5: STT routes — attempt guard + durable quota

**Files:**
- Modify: `app/api/game/stt/route.ts` (require + validate attemptId/levelId, consume quota)
- Modify: `app/api/game/stt/token/route.ts` (require + validate attemptId/levelId query params, consume quota)
- Modify: `hooks/use-voice-input.ts` (pass attemptId/levelId to the token fetch)
- Possibly modify: the component that calls `useVoiceInput` (thread attemptId/levelId props — find with `grep -rn "useVoiceInput(" components hooks`)

**Interfaces:**
- Consumes: `guardVoiceAttempt` (without `npcText`) and `consumeVoiceQuota` from Task 4.
- Produces: STT endpoints that reject requests outside an owned `IN_PROGRESS` attempt and count against `stt_requests` daily quota.

- [ ] **Step 1: Harden `app/api/game/stt/route.ts`**

After the size checks, replace the loose attemptId/levelId parsing with strict validation:

```ts
  const attemptIdRaw = form?.get("attemptId");
  const levelIdRaw = form?.get("levelId");
  const attemptId = typeof attemptIdRaw === "string" ? attemptIdRaw : "";
  const levelId = typeof levelIdRaw === "string" ? Number(levelIdRaw) : NaN;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId) || !Number.isInteger(levelId)) {
    return NextResponse.json({ error: "attemptId and levelId are required" }, { status: 400 });
  }

  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, attemptId, levelId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { sttRequests: 1 });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Dzienny limit rozpoznawania mowy wyczerpany." }, { status: 429 });
  }
```

Keep the existing `logAiUsage` calls; pass `attemptId` and `levelId` directly now that they are validated.

- [ ] **Step 2: Harden `app/api/game/stt/token/route.ts`**

Change `GET()` to `GET(request: Request)`; before minting the ElevenLabs token:

```ts
  const url = new URL(request.url);
  const attemptId = url.searchParams.get("attemptId") ?? "";
  const levelId = Number(url.searchParams.get("levelId"));

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId) || !Number.isInteger(levelId)) {
    return NextResponse.json({ error: "attemptId and levelId are required" }, { status: 400 });
  }

  const guard = await guardVoiceAttempt(auth.supabase, auth.user.id, attemptId, levelId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const quota = await consumeVoiceQuota(auth.supabase, auth.user.id, { sttRequests: 1 });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Dzienny limit rozpoznawania mowy wyczerpany." }, { status: 429 });
  }
```

Imports as in Task 4 Step 6.

- [ ] **Step 3: Thread attemptId/levelId through the client**

In `hooks/use-voice-input.ts`: find the token fetch (`fetch("/api/game/stt/token")` around line 210). The hook must receive `attemptId: string` and `levelId: number` (add to its options/params interface following the hook's existing style) and call:

```ts
const tokenResponse = await fetch(
  `/api/game/stt/token?attemptId=${encodeURIComponent(attemptId)}&levelId=${levelId}`,
);
```

Then `grep -rn "useVoiceInput(" components app hooks` and pass `attemptId`/`levelId` at each call site (the conversation UI has `snapshot.id` and `levelId` in scope — same values the TTS path already uses). If a call site exists outside an attempt context, STOP and report it instead of guessing.

Also update the `/api/game/stt/usage` beacon in the same hook only if it breaks compilation — its hardening is out of scope (logging-only endpoint, no ElevenLabs cost).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm test` — expected: PASS.
Run: `npm run lint` — expected: no new errors versus main.

- [ ] **Step 5: Commit**

```bash
git add app/api/game/stt/route.ts app/api/game/stt/token/route.ts hooks/use-voice-input.ts components
git commit -m "fix(voice): gate STT transcription and realtime tokens behind owned in-progress attempts with daily quota"
```

---

### Task 6: Full verification + operator checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-payment-model-audit-design.md` (tick off Etap 1 items 1–3 as implemented-pending-deploy)

- [ ] **Step 1: Run the full suite**

Run: `npx tsc --noEmit` && `npm test` && `npm run lint`
Expected: all green. If lint was already failing on main, compare against a `git stash` baseline and only fix NEW issues.

- [ ] **Step 2: Update the spec status + commit**

```bash
git add docs/superpowers/specs/2026-07-20-payment-model-audit-design.md
git commit -m "docs: mark Etap 1 billing fixes implemented (pending deploy + operator tasks)"
```

**Operator tasks (user-side, cannot be done from this repo — report at the end):**
1. Stripe (konto ConvinceMe, tryb test i live): utworzyć osobny Price €14.99 dla 40-paka; ustawić `STRIPE_PRICE_ATTEMPTS_40` w `.env.local` i na Vercelu.
2. Stripe webhook endpoint: dodać eventy `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`.
3. Etap 0: przywrócić/odtworzyć projekt Supabase i wykonać `supabase db push` (w tym nową migrację `20260720000000`).
4. Vercel env: `TTS_DAILY_CHAR_LIMIT`, `STT_DAILY_REQUEST_LIMIT` (opcjonalnie; defaulty 40000/200).
5. Po rejestracji VAT OSS: `STRIPE_AUTOMATIC_TAX=true`.
