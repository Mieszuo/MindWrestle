-- Attempt wallet and Stripe billing support for one-time attempt packages.

create table if not exists public.user_attempt_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  paid_attempts_balance integer not null default 0 check (paid_attempts_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_attempt_wallets enable row level security;

create policy "Users can view own attempt wallet"
  on public.user_attempt_wallets for select
  using ((select auth.uid()) = user_id);

create table if not exists public.attempt_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.conversation_attempts (id) on delete set null,
  level_id integer references public.game_levels (id) on delete set null,
  source text not null check (source in ('free_monthly', 'paid_pack', 'admin_grant', 'adjustment')),
  amount integer not null check (amount <> 0),
  period_key text,
  stripe_event_id text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists attempt_ledger_user_created_idx on public.attempt_ledger (user_id, created_at desc);
create index if not exists attempt_ledger_user_period_idx on public.attempt_ledger (user_id, period_key, source);
create index if not exists attempt_ledger_attempt_idx on public.attempt_ledger (attempt_id);
create index if not exists attempt_ledger_stripe_event_idx on public.attempt_ledger (stripe_event_id);

alter table public.attempt_ledger enable row level security;

create policy "Users can view own attempt ledger"
  on public.attempt_ledger for select
  using ((select auth.uid()) = user_id);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists billing_events_user_idx on public.billing_events (user_id, processed_at desc);

alter table public.billing_events enable row level security;

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
      and level_id = p_level_id
      and source = 'free_monthly'
      and period_key = p_period_key
      and amount < 0;

    if v_free_used < p_free_limit then
      insert into public.attempt_ledger (user_id, level_id, source, amount, period_key, description)
      values (p_user_id, p_level_id, 'free_monthly', -1, p_period_key, 'Monthly free attempt')
      returning id into v_ledger_id;

      return query select true, 'free_monthly'::text, v_ledger_id, greatest(p_free_limit - v_free_used - 1, 0), v_wallet.paid_attempts_balance;
      return;
    end if;
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

    return query select true, 'paid_pack'::text, v_ledger_id, greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance;
    return;
  end if;

  return query select false, null::text, null::uuid, greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance;
end;
$$;

revoke execute on function public.consume_attempt_credit(uuid, integer, text, integer) from public;
grant execute on function public.consume_attempt_credit(uuid, integer, text, integer) to authenticated;

create or replace function public.attach_attempt_ledger(
  p_user_id uuid,
  p_ledger_id uuid,
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  update public.attempt_ledger
  set attempt_id = p_attempt_id
  where id = p_ledger_id
    and user_id = p_user_id
    and attempt_id is null;
end;
$$;

revoke execute on function public.attach_attempt_ledger(uuid, uuid, uuid) from public;
grant execute on function public.attach_attempt_ledger(uuid, uuid, uuid) to authenticated;

create or replace function public.credit_paid_attempt_pack(
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
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.billing_events (stripe_event_id, event_type, user_id, payload)
  values (p_stripe_event_id, p_event_type, p_user_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (stripe_event_id) do nothing;

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

revoke execute on function public.credit_paid_attempt_pack(uuid, integer, text, text, jsonb, text) from public;
grant execute on function public.credit_paid_attempt_pack(uuid, integer, text, text, jsonb, text) to service_role;
