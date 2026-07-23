-- Make Stripe Checkout fulfillment idempotent by Checkout Session, not only by Event ID.

alter table public.billing_events
  add column if not exists checkout_session_id text;

create unique index if not exists billing_events_checkout_session_idx
  on public.billing_events (checkout_session_id)
  where checkout_session_id is not null;

drop function if exists public.credit_paid_attempt_pack(uuid, integer, text, text, jsonb, text);

create or replace function public.credit_paid_attempt_pack(
  p_user_id uuid,
  p_amount integer,
  p_stripe_event_id text,
  p_checkout_session_id text,
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
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_checkout_session_id is null or length(trim(p_checkout_session_id)) = 0 then
    raise exception 'checkout session id is required';
  end if;

  insert into public.billing_events (stripe_event_id, checkout_session_id, event_type, user_id, payload)
  values (p_stripe_event_id, p_checkout_session_id, p_event_type, p_user_id, coalesce(p_payload, '{}'::jsonb))
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.user_attempt_wallets (user_id, paid_attempts_balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update set
    paid_attempts_balance = public.user_attempt_wallets.paid_attempts_balance + excluded.paid_attempts_balance,
    updated_at = now();

  insert into public.attempt_ledger (user_id, source, amount, stripe_event_id, description)
  values (p_user_id, 'paid_pack', p_amount, p_stripe_event_id, p_description);

  return true;
end;
$$;

revoke execute on function public.credit_paid_attempt_pack(uuid, integer, text, text, text, jsonb, text) from public;
grant execute on function public.credit_paid_attempt_pack(uuid, integer, text, text, text, jsonb, text) to service_role;
