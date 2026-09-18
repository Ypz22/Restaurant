create or replace function rpc_get_order_history(p_device_token uuid)
returns table (
  round_id uuid,
  submitted_at timestamptz,
  round_status text,
  kitchen_notes text,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    return;
  end if;

  if not exists (
    select 1 from table_sessions ts
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where ts.id = v_session_id and r.status = 'active'
  ) then
    raise exception 'restaurant_suspended';
  end if;

  return query
    select
      r.id,
      r.submitted_at,
      r.status,
      r.notes,
      jsonb_agg(
        jsonb_build_object(
          'dish_name', d.name,
          'quantity', ci.quantity,
          'notes', ci.notes,
          'unit_price', ci.unit_price_snapshot
        ) order by ci.created_at, ci.id
      )
    from order_rounds r
    join cart_items ci on ci.order_round_id = r.id and ci.status = 'submitted'
    join dishes d on d.id = ci.dish_id
    where r.table_session_id = v_session_id
    group by r.id, r.submitted_at, r.status, r.notes
    order by r.submitted_at desc, r.id desc;
end;
$$;

grant execute on function rpc_get_order_history(uuid) to anon, authenticated;
