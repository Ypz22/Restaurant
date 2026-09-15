create or replace function rpc_add_cart_item(p_device_token uuid, p_dish_id uuid, p_quantity int, p_notes text default '')
returns cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diner_id uuid;
  v_session_id uuid;
  v_price numeric(10,2);
  v_available boolean;
  v_row cart_items;
begin
  select id, table_session_id into v_diner_id, v_session_id
    from diners where device_token = p_device_token;
  if v_diner_id is null then
    raise exception 'invalid_device_token';
  end if;

  select price, is_available into v_price, v_available from dishes where id = p_dish_id;
  if v_price is null then
    raise exception 'dish_not_found';
  end if;
  if not v_available then
    raise exception 'dish_unavailable';
  end if;
  if p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  insert into cart_items (table_session_id, dish_id, diner_id, quantity, notes, unit_price_snapshot)
    values (v_session_id, p_dish_id, v_diner_id, p_quantity, coalesce(p_notes, ''), v_price)
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function rpc_add_cart_item(uuid, uuid, int, text) to anon, authenticated;
