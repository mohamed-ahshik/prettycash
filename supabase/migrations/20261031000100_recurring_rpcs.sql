create or replace function public.post_recurring_occurrence(
  p_recurring_item_id uuid,
  p_occurrence_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.recurring_items%rowtype;
  v_occurrence public.recurring_occurrences%rowtype;
  v_occurrence_id uuid;
  v_transaction_id uuid;
begin
  select *
  into v_item
  from public.recurring_items
  where id = p_recurring_item_id
    and active = true;

  if not found then
    return null;
  end if;

  insert into public.recurring_occurrences (
    user_id,
    recurring_item_id,
    occurrence_date,
    status
  )
  values (
    v_item.user_id,
    v_item.id,
    p_occurrence_date,
    'posted'
  )
  on conflict (recurring_item_id, occurrence_date) do nothing
  returning id into v_occurrence_id;

  if v_occurrence_id is null then
    select *
    into v_occurrence
    from public.recurring_occurrences
    where recurring_item_id = p_recurring_item_id
      and occurrence_date = p_occurrence_date;

    return v_occurrence.transaction_id;
  end if;

  insert into public.transactions (
    user_id,
    name,
    date,
    time,
    category_id,
    type,
    amount,
    icon,
    note
  )
  values (
    v_item.user_id,
    v_item.name,
    p_occurrence_date,
    null,
    v_item.category_id,
    v_item.type,
    v_item.amount,
    v_item.icon,
    'Recurring'
  )
  returning id into v_transaction_id;

  update public.recurring_occurrences
  set transaction_id = v_transaction_id
  where id = v_occurrence_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.post_recurring_occurrence(uuid, date) from public, anon, authenticated;
grant execute on function public.post_recurring_occurrence(uuid, date) to service_role;

create or replace function public.create_pending_recurring_occurrence(
  p_recurring_item_id uuid,
  p_occurrence_date date
)
returns table (
  occurrence_id uuid,
  inserted boolean,
  status text,
  notification_sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.recurring_items%rowtype;
  v_occurrence_id uuid;
begin
  select *
  into v_item
  from public.recurring_items
  where id = p_recurring_item_id
    and active = true;

  if not found then
    return;
  end if;

  insert into public.recurring_occurrences (
    user_id,
    recurring_item_id,
    occurrence_date,
    status
  )
  values (
    v_item.user_id,
    v_item.id,
    p_occurrence_date,
    'pending'
  )
  on conflict (recurring_item_id, occurrence_date) do nothing
  returning id into v_occurrence_id;

  if v_occurrence_id is null then
    return query
    select o.id, false, o.status, o.notification_sent_at
    from public.recurring_occurrences o
    where o.recurring_item_id = p_recurring_item_id
      and o.occurrence_date = p_occurrence_date;
    return;
  end if;

  return query
  select v_occurrence_id, true, 'pending'::text, null::timestamptz;
end;
$$;

revoke all on function public.create_pending_recurring_occurrence(uuid, date) from public, anon, authenticated;
grant execute on function public.create_pending_recurring_occurrence(uuid, date) to service_role;

create or replace function public.resolve_recurring_occurrence(
  p_occurrence_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_occurrence public.recurring_occurrences%rowtype;
  v_item public.recurring_items%rowtype;
  v_transaction_id uuid;
begin
  if p_decision not in ('post', 'skip') then
    raise exception 'decision must be post or skip';
  end if;

  select *
  into v_occurrence
  from public.recurring_occurrences
  where id = p_occurrence_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'recurring occurrence not found';
  end if;

  if v_occurrence.status <> 'pending' then
    return v_occurrence.transaction_id;
  end if;

  if p_decision = 'skip' then
    update public.recurring_occurrences
    set status = 'skipped',
        resolved_at = now()
    where id = p_occurrence_id;
    return null;
  end if;

  select *
  into v_item
  from public.recurring_items
  where id = v_occurrence.recurring_item_id
    and user_id = auth.uid();

  if not found then
    raise exception 'recurring item not found';
  end if;

  insert into public.transactions (
    user_id,
    name,
    date,
    time,
    category_id,
    type,
    amount,
    icon,
    note
  )
  values (
    v_occurrence.user_id,
    v_item.name,
    v_occurrence.occurrence_date,
    null,
    v_item.category_id,
    v_item.type,
    v_item.amount,
    v_item.icon,
    'Recurring'
  )
  returning id into v_transaction_id;

  update public.recurring_occurrences
  set status = 'posted',
      transaction_id = v_transaction_id,
      resolved_at = now()
  where id = p_occurrence_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.resolve_recurring_occurrence(uuid, text) from public, anon;
grant execute on function public.resolve_recurring_occurrence(uuid, text) to authenticated;
