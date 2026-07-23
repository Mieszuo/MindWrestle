-- Atomic attempt start: consume a credit AND create the attempt row in one
-- transaction. Previously the credit was consumed (wallet decremented / free
-- ledger row written) before the attempt INSERT ran, so a failed INSERT burned
-- a paid or free attempt with no conversation to show for it. Wrapping both in a
-- single SECURITY DEFINER function makes the credit debit roll back with the row.

create or replace function public.start_attempt_atomic(
  p_user_id uuid,
  p_level_id integer,
  p_period_key text,
  p_free_limit integer,
  p_emotion_state jsonb,
  p_reputation_session jsonb,
  p_reputation_context jsonb,
  p_psych_state jsonb,
  p_progress_id uuid,
  p_now timestamptz
)
returns table (
  allowed boolean,
  source text,
  free_remaining integer,
  paid_remaining integer,
  attempt jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.user_attempt_wallets%rowtype;
  v_free_used integer := 0;
  v_source text;
  v_attempt public.conversation_attempts%rowtype;
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

  -- Decide the funding source before writing anything. A frozen wallet (dispute)
  -- can never consume, matching consume_attempt_credit.
  if v_wallet.frozen_at is not null then
    v_source := null;
  elsif p_free_limit > 0 and v_free_used < p_free_limit then
    v_source := 'free_monthly';
  elsif v_wallet.paid_attempts_balance > 0 then
    v_source := 'paid_pack';
  else
    v_source := null;
  end if;

  if v_source is null then
    return query select false, null::text,
      greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance, null::jsonb;
    return;
  end if;

  -- Abandon any prior in-progress attempt for this level (same as the old flow).
  update public.conversation_attempts
  set status = 'ABANDONED',
      failure_reason = 'NEW_ATTEMPT_STARTED',
      ended_at = p_now,
      updated_at = p_now
  where user_id = p_user_id
    and level_id = p_level_id
    and status = 'IN_PROGRESS';

  insert into public.conversation_attempts (
    user_id,
    level_id,
    status,
    current_emotion_state,
    goal_progress,
    reputation_session,
    reputation_context,
    psych_state,
    last_activity_at
  )
  values (
    p_user_id,
    p_level_id,
    'IN_PROGRESS',
    p_emotion_state,
    0,
    p_reputation_session,
    p_reputation_context,
    p_psych_state,
    p_now
  )
  returning * into v_attempt;

  -- Consume the credit, linking the ledger row to the freshly-created attempt.
  if v_source = 'paid_pack' then
    update public.user_attempt_wallets
    set paid_attempts_balance = paid_attempts_balance - 1,
        updated_at = p_now
    where user_id = p_user_id
    returning * into v_wallet;

    insert into public.attempt_ledger (user_id, level_id, attempt_id, source, amount, period_key, description)
    values (p_user_id, p_level_id, v_attempt.id, 'paid_pack', -1, p_period_key, 'Paid package attempt');
  else
    insert into public.attempt_ledger (user_id, level_id, attempt_id, source, amount, period_key, description)
    values (p_user_id, p_level_id, v_attempt.id, 'free_monthly', -1, p_period_key, 'Monthly free attempt');

    v_free_used := v_free_used + 1;
  end if;

  update public.user_level_progress
  set attempts_count = attempts_count + 1,
      last_attempt_id = v_attempt.id,
      last_status = 'IN_PROGRESS',
      updated_at = p_now
  where id = p_progress_id;

  return query select true, v_source,
    greatest(p_free_limit - v_free_used, 0), v_wallet.paid_attempts_balance, to_jsonb(v_attempt);
end;
$$;

revoke execute on function public.start_attempt_atomic(uuid, integer, text, integer, jsonb, jsonb, jsonb, jsonb, uuid, timestamptz) from public;
grant execute on function public.start_attempt_atomic(uuid, integer, text, integer, jsonb, jsonb, jsonb, jsonb, uuid, timestamptz) to authenticated;
