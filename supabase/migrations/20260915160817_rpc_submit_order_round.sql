create or replace function rpc_submit_order_round(p_device_token uuid)
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
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;

  perform 1 from cart_items
    where table_session_id = v_session_id and status = 'in_cart'
    for update;

  if not found then
    raise exception 'empty_cart';
  end if;

  insert into order_rounds (table_session_id, status)
    values (v_session_id, 'pending')
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

grant execute on function rpc_submit_order_round(uuid) to anon, authenticated;
