-- I3: rpc_add_cart_item looked up dishes.price/is_available by p_dish_id
-- alone, with no check that the dish belongs to the same restaurant as the
-- table session's table. Since `dishes` is publicly readable, a client could
-- add any restaurant's dish to any other restaurant's cart. Resolve the
-- session's restaurant_id (table_sessions -> tables -> restaurant_id, same
-- join pattern used elsewhere, e.g. rpc_get_table) and reject a mismatch
-- with the existing 'dish_not_found' exception (reused rather than a new
-- exception name, since the TS wrapper doesn't need to distinguish these
-- cases).
create or replace function rpc_add_cart_item(p_device_token uuid, p_dish_id uuid, p_quantity int, p_notes text default '')
returns cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diner_id uuid;
  v_session_id uuid;
  v_restaurant_id uuid;
  v_price numeric(10,2);
  v_available boolean;
  v_dish_restaurant_id uuid;
  v_row cart_items;
begin
  select id, table_session_id into v_diner_id, v_session_id
    from diners where device_token = p_device_token;
  if v_diner_id is null then
    raise exception 'invalid_device_token';
  end if;

  select t.restaurant_id into v_restaurant_id
    from table_sessions ts
    join tables t on t.id = ts.table_id
    where ts.id = v_session_id;

  select price, is_available, restaurant_id into v_price, v_available, v_dish_restaurant_id
    from dishes where id = p_dish_id;
  if v_price is null then
    raise exception 'dish_not_found';
  end if;
  if v_dish_restaurant_id is distinct from v_restaurant_id then
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
