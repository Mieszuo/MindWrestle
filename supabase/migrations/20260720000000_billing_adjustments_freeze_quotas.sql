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
