create or replace function rpc_update_cart_item_quantity(p_device_token uuid, p_cart_item_id uuid, p_quantity int)
returns cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_row cart_items;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  update cart_items set quantity = p_quantity
    where id = p_cart_item_id and table_session_id = v_session_id and status = 'in_cart'
    returning * into v_row;

  if v_row.id is null then
    raise exception 'cart_item_not_found';
  end if;

  return v_row;
end;
$$;

create or replace function rpc_remove_cart_item(p_device_token uuid, p_cart_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_deleted uuid;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;

  delete from cart_items
    where id = p_cart_item_id and table_session_id = v_session_id and status = 'in_cart'
    returning id into v_deleted;

  if v_deleted is null then
    raise exception 'cart_item_not_found';
  end if;
end;
$$;

grant execute on function rpc_update_cart_item_quantity(uuid, uuid, int) to anon, authenticated;
grant execute on function rpc_remove_cart_item(uuid, uuid) to anon, authenticated;
