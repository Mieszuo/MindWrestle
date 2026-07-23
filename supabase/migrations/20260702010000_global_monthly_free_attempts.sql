-- Make monthly free attempts universal across all characters.

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
