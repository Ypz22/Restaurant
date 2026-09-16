alter table table_requests
  add column reason text not null default '',
  add column notes text not null default '';

alter table order_rounds
  add column notes text not null default '';

create or replace function rpc_create_table_request(
  p_device_token uuid,
  p_type text,
  p_reason text,
  p_notes text
)
returns table_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_row table_requests;
begin
  select table_session_id into v_session_id
    from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if p_type not in ('llamar_mesero', 'agua') then
    raise exception 'invalid_request_type';
  end if;
  if length(coalesce(p_reason, '')) > 100 or length(coalesce(p_notes, '')) > 140 then
    raise exception 'request_detail_too_long';
  end if;

  select * into v_row from table_requests
    where table_session_id = v_session_id and type = p_type and status = 'pending'
    order by created_at desc
    limit 1;
  if v_row.id is not null then
    update table_requests
      set reason = coalesce(p_reason, ''), notes = coalesce(p_notes, '')
      where id = v_row.id
      returning * into v_row;
    return v_row;
  end if;

  insert into table_requests (table_session_id, type, status, reason, notes)
    values (v_session_id, p_type, 'pending', coalesce(p_reason, ''), coalesce(p_notes, ''))
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_create_table_request(uuid, text, text, text) to anon, authenticated;

create or replace function rpc_submit_order_round(
  p_device_token uuid,
  p_kitchen_notes text
)
returns order_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_round order_rounds;
  v_moved int;
begin
  select table_session_id into v_session_id
    from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if length(coalesce(p_kitchen_notes, '')) > 140 then
    raise exception 'kitchen_notes_too_long';
  end if;

  perform 1 from cart_items
    where table_session_id = v_session_id and status = 'in_cart'
    for update;
  if not found then
    raise exception 'empty_cart';
  end if;

  insert into order_rounds (table_session_id, status, notes)
    values (v_session_id, 'pending', coalesce(p_kitchen_notes, ''))
    returning * into v_round;

  update cart_items
    set status = 'submitted', order_round_id = v_round.id
    where table_session_id = v_session_id and status = 'in_cart';
  get diagnostics v_moved = row_count;
  if v_moved = 0 then
    raise exception 'empty_cart';
  end if;
  return v_round;
end;
$$;

grant execute on function rpc_submit_order_round(uuid, text) to anon, authenticated;

create or replace function rpc_get_latest_order(p_device_token uuid)
returns table (
  round_id uuid,
  submitted_at timestamptz,
  round_status text,
  kitchen_notes text,
  cart_item_id uuid,
  dish_id uuid,
  dish_name text,
  quantity int,
  item_notes text,
  unit_price_snapshot numeric(10,2)
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, r.submitted_at, r.status, r.notes,
    ci.id, ci.dish_id, d.name, ci.quantity, ci.notes, ci.unit_price_snapshot
  from order_rounds r
  join cart_items ci on ci.order_round_id = r.id
  join dishes d on d.id = ci.dish_id
  where r.id = (
    select recent.id from order_rounds recent
    where recent.table_session_id = (
      select diner.table_session_id from diners diner
      where diner.device_token = p_device_token
    )
    order by recent.submitted_at desc, recent.id desc
    limit 1
  )
  order by ci.created_at, ci.id;
$$;

grant execute on function rpc_get_latest_order(uuid) to anon, authenticated;

alter publication supabase_realtime add table order_rounds;
