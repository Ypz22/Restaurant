-- Lectura y escritura para /admin (sin login todavía): funciones security
-- definer scoped por restaurant_id, sin chequeo de identidad. menu_categories
-- y dishes siguen con "public read" (sin cambios); tables, table_sessions,
-- order_rounds, cart_items y table_requests perdieron su "public read" en
-- 20260916000300_private_table_access.sql (el cliente entra por device_token),
-- así que admin necesita sus propias funciones de lectura.

create or replace function rpc_admin_get_tables(p_restaurant_id uuid)
returns table (id uuid, label text, qr_token uuid, session_id uuid, opened_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select t.id, t.label, t.qr_token, ts.id as session_id, ts.opened_at
  from tables t
  left join table_sessions ts on ts.table_id = t.id and ts.status = 'open'
  where t.restaurant_id = p_restaurant_id
  order by t.label;
$$;

grant execute on function rpc_admin_get_tables(uuid) to anon, authenticated;

create or replace function rpc_admin_get_pending_requests(p_restaurant_id uuid)
returns table (id uuid, table_label text, type text, reason text, notes text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select tr.id, t.label, tr.type, tr.reason, tr.notes, tr.created_at
  from table_requests tr
  join table_sessions ts on ts.id = tr.table_session_id
  join tables t on t.id = ts.table_id
  where t.restaurant_id = p_restaurant_id and tr.status = 'pending'
  order by tr.created_at;
$$;

grant execute on function rpc_admin_get_pending_requests(uuid) to anon, authenticated;

create or replace function rpc_admin_get_active_tickets(p_restaurant_id uuid)
returns table (
  round_id uuid, table_label text, submitted_at timestamptz, status text, kitchen_notes text,
  item_id uuid, dish_name text, quantity int, item_notes text
)
language sql
security definer
set search_path = public
as $$
  select r.id, t.label, r.submitted_at, r.status, r.notes,
         ci.id, d.name, ci.quantity, ci.notes
  from order_rounds r
  join table_sessions ts on ts.id = r.table_session_id
  join tables t on t.id = ts.table_id
  left join cart_items ci on ci.order_round_id = r.id
  left join dishes d on d.id = ci.dish_id
  where t.restaurant_id = p_restaurant_id and r.status in ('pending', 'preparing', 'ready')
  order by r.submitted_at, ci.created_at;
$$;

grant execute on function rpc_admin_get_active_tickets(uuid) to anon, authenticated;

create or replace function rpc_admin_upsert_category(
  p_restaurant_id uuid,
  p_id uuid,
  p_name text,
  p_sort_order int
)
returns menu_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row menu_categories;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'invalid_category_name';
  end if;

  if p_id is null then
    insert into menu_categories (restaurant_id, name, sort_order)
      values (p_restaurant_id, p_name, coalesce(p_sort_order, 0))
      returning * into v_row;
  else
    update menu_categories
      set name = p_name, sort_order = coalesce(p_sort_order, sort_order)
      where id = p_id and restaurant_id = p_restaurant_id
      returning * into v_row;
    if v_row.id is null then
      raise exception 'category_not_found';
    end if;
  end if;
  return v_row;
end;
$$;

grant execute on function rpc_admin_upsert_category(uuid, uuid, text, int) to anon, authenticated;

create or replace function rpc_admin_delete_category(p_restaurant_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from dishes where category_id = p_id and restaurant_id = p_restaurant_id) then
    raise exception 'category_has_dishes';
  end if;
  delete from menu_categories where id = p_id and restaurant_id = p_restaurant_id;
  if not found then
    raise exception 'category_not_found';
  end if;
end;
$$;

grant execute on function rpc_admin_delete_category(uuid, uuid) to anon, authenticated;

create or replace function rpc_admin_upsert_dish(
  p_restaurant_id uuid,
  p_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_photo_url text,
  p_is_available boolean
)
returns dishes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row dishes;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'invalid_dish_name';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'invalid_price';
  end if;
  if not exists (select 1 from menu_categories where id = p_category_id and restaurant_id = p_restaurant_id) then
    raise exception 'invalid_category';
  end if;

  if p_id is null then
    insert into dishes (restaurant_id, category_id, name, description, price, photo_url, is_available)
      values (p_restaurant_id, p_category_id, p_name, coalesce(p_description, ''), p_price, p_photo_url, coalesce(p_is_available, true))
      returning * into v_row;
  else
    update dishes
      set category_id = p_category_id,
          name = p_name,
          description = coalesce(p_description, ''),
          price = p_price,
          photo_url = p_photo_url,
          is_available = coalesce(p_is_available, is_available)
      where id = p_id and restaurant_id = p_restaurant_id
      returning * into v_row;
    if v_row.id is null then
      raise exception 'dish_not_found';
    end if;
  end if;
  return v_row;
end;
$$;

grant execute on function rpc_admin_upsert_dish(uuid, uuid, uuid, text, text, numeric, text, boolean) to anon, authenticated;

create or replace function rpc_admin_delete_dish(p_restaurant_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from dishes where id = p_id and restaurant_id = p_restaurant_id;
  if not found then
    raise exception 'dish_not_found';
  end if;
end;
$$;

grant execute on function rpc_admin_delete_dish(uuid, uuid) to anon, authenticated;

create or replace function rpc_admin_set_dish_availability(p_restaurant_id uuid, p_dish_id uuid, p_is_available boolean)
returns dishes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row dishes;
begin
  update dishes set is_available = p_is_available
    where id = p_dish_id and restaurant_id = p_restaurant_id
    returning * into v_row;
  if v_row.id is null then
    raise exception 'dish_not_found';
  end if;
  return v_row;
end;
$$;

grant execute on function rpc_admin_set_dish_availability(uuid, uuid, boolean) to anon, authenticated;

create or replace function rpc_admin_close_table_session(p_restaurant_id uuid, p_table_session_id uuid)
returns table_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row table_sessions;
begin
  select ts.* into v_row
    from table_sessions ts
    join tables t on t.id = ts.table_id
    where ts.id = p_table_session_id and t.restaurant_id = p_restaurant_id;
  if v_row.id is null then
    raise exception 'table_session_not_found';
  end if;

  if v_row.status = 'closed' then
    return v_row;
  end if;

  update table_sessions set status = 'closed', closed_at = now()
    where id = p_table_session_id
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_admin_close_table_session(uuid, uuid) to anon, authenticated;

create or replace function rpc_admin_acknowledge_table_request(p_restaurant_id uuid, p_request_id uuid)
returns table_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row table_requests;
begin
  select tr.* into v_row
    from table_requests tr
    join table_sessions ts on ts.id = tr.table_session_id
    join tables t on t.id = ts.table_id
    where tr.id = p_request_id and t.restaurant_id = p_restaurant_id;
  if v_row.id is null then
    raise exception 'request_not_found';
  end if;

  update table_requests set status = 'acknowledged'
    where id = p_request_id
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_admin_acknowledge_table_request(uuid, uuid) to anon, authenticated;

create or replace function rpc_admin_advance_order_round(p_restaurant_id uuid, p_round_id uuid, p_next_status text)
returns order_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row order_rounds;
  v_valid_next text;
begin
  select r.* into v_row
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    where r.id = p_round_id and t.restaurant_id = p_restaurant_id;
  if v_row.id is null then
    raise exception 'order_round_not_found';
  end if;

  v_valid_next := case v_row.status
    when 'pending' then 'preparing'
    when 'preparing' then 'ready'
    when 'ready' then 'delivered'
    else null
  end;

  if v_valid_next is null or p_next_status <> v_valid_next then
    raise exception 'invalid_status_transition';
  end if;

  update order_rounds set status = p_next_status
    where id = p_round_id
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_admin_advance_order_round(uuid, uuid, text) to anon, authenticated;

-- Storage: fotos de plato, bucket público en lectura, escritura scoped por
-- carpeta {restaurant_id}/ (mismo nivel de "sin identidad" que las RPC de arriba).
insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

create policy "public read dish photos" on storage.objects
  for select using (bucket_id = 'dish-photos');

create policy "restaurant scoped dish photo upload" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from restaurants r where r.id::text = (storage.foldername(name))[1]
    )
  );

create policy "restaurant scoped dish photo update" on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from restaurants r where r.id::text = (storage.foldername(name))[1]
    )
  );

alter publication supabase_realtime add table table_sessions;
alter publication supabase_realtime add table table_requests;
