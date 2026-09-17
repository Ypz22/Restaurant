-- Autenticación y autorización de staff (spec 2026-09-17-auth-multitenant-design.md).
-- Hasta ahora los rpc_admin_* eran security definer, concedidos a anon, y
-- confiaban en el p_restaurant_id que enviaba el navegador: cualquiera que
-- conociera el id de un restaurante podía mutar su menú, cerrar mesas o
-- avanzar tickets. Esta migración agrega login para el staff (Supabase Auth,
-- roles admin/kitchen por restaurante + platform_admin global) y hace que
-- cada RPC de admin/KDS/plataforma verifique el rol de quien llama. El
-- comensal no cambia: sigue sin cuenta, identificado por qr_token/device_token.

-- ============================================================================
-- 1. Tablas de plataforma (globales)
-- ============================================================================

alter table restaurants
  add column status text not null default 'active'
  check (status in ('active', 'suspended'));

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table restaurant_staff (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_staff_user_id_idx on restaurant_staff(user_id);

alter table platform_admins enable row level security;
alter table restaurant_staff enable row level security;

create policy "read own platform_admins" on platform_admins
  for select to authenticated using (user_id = auth.uid());

create policy "read own restaurant_staff" on restaurant_staff
  for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- 2. Helpers de autorización (schema private: no expuesto por la API)
-- ============================================================================

create schema if not exists private;

create or replace function private.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function private.require_platform_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;
end;
$$;

-- Verifica que quien llama tenga uno de p_roles en p_restaurant_id y que el
-- restaurante esté activo. Un platform_admin NO pasa este chequeo solo por
-- serlo: administra restaurantes, no opera su cocina ni su menú.
create or replace function private.require_staff_role(p_restaurant_id uuid, p_roles text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from restaurants where id = p_restaurant_id and status = 'active') then
    raise exception 'restaurant_suspended';
  end if;
  if not exists (
    select 1 from restaurant_staff
    where restaurant_id = p_restaurant_id and user_id = auth.uid() and role = any(p_roles)
  ) then
    raise exception 'forbidden';
  end if;
end;
$$;

-- Solo verifica el estado del restaurante, sin exigir sesión: la usan los
-- RPC del comensal (sin login) para bloquear un restaurante suspendido.
create or replace function private.require_active_restaurant(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from restaurants where id = p_restaurant_id and status = 'active') then
    raise exception 'restaurant_suspended';
  end if;
end;
$$;

revoke execute on function private.is_platform_admin() from public, anon, authenticated;
revoke execute on function private.require_platform_admin() from public, anon, authenticated;
revoke execute on function private.require_staff_role(uuid, text[]) from public, anon, authenticated;
revoke execute on function private.require_active_restaurant(uuid) from public, anon, authenticated;

-- ============================================================================
-- 3. RPC de admin/KDS: se agrega el chequeo de rol (mismo cuerpo que antes)
-- ============================================================================

create or replace function rpc_admin_get_tables(p_restaurant_id uuid)
returns table (id uuid, label text, qr_token uuid, availability text, session_id uuid, opened_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);
  return query
    select t.id, t.label, t.qr_token, t.availability, ts.id as session_id, ts.opened_at
    from tables t
    left join table_sessions ts on ts.table_id = t.id and ts.status = 'open'
    where t.restaurant_id = p_restaurant_id
    order by t.label;
end;
$$;

create or replace function rpc_admin_get_pending_requests(p_restaurant_id uuid)
returns table (id uuid, table_id uuid, table_label text, type text, reason text, notes text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);
  return query
    select tr.id, t.id, t.label, tr.type, tr.reason, tr.notes, tr.created_at
    from table_requests tr
    join table_sessions ts on ts.id = tr.table_session_id
    join tables t on t.id = ts.table_id
    where t.restaurant_id = p_restaurant_id and tr.status = 'pending'
    order by tr.created_at;
end;
$$;

create or replace function rpc_admin_get_active_tickets(p_restaurant_id uuid)
returns table (
  round_id uuid, table_label text, submitted_at timestamptz, status text, kitchen_notes text,
  item_id uuid, dish_name text, quantity int, item_notes text, prepared_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin', 'kitchen']);
  return query
    select r.id, t.label, r.submitted_at, r.status, r.notes,
           ci.id, d.name, ci.quantity, ci.notes, ci.prepared_at
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    left join cart_items ci on ci.order_round_id = r.id
    left join dishes d on d.id = ci.dish_id
    where t.restaurant_id = p_restaurant_id and r.status in ('pending', 'preparing', 'ready')
    order by r.submitted_at, ci.created_at;
end;
$$;

create or replace function rpc_admin_get_delivered_tickets(p_restaurant_id uuid)
returns table (
  round_id uuid, table_label text, submitted_at timestamptz, status text, kitchen_notes text,
  item_id uuid, dish_name text, quantity int, item_notes text, prepared_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin', 'kitchen']);
  return query
    select r.id, t.label, r.submitted_at, r.status, r.notes,
           ci.id, d.name, ci.quantity, ci.notes, ci.prepared_at
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    left join cart_items ci on ci.order_round_id = r.id
    left join dishes d on d.id = ci.dish_id
    where t.restaurant_id = p_restaurant_id and r.status = 'delivered'
      and r.submitted_at > now() - interval '3 hours'
    order by r.submitted_at desc, ci.created_at;
end;
$$;

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
  perform private.require_staff_role(p_restaurant_id, array['admin']);

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

create or replace function rpc_admin_delete_category(p_restaurant_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  if exists (select 1 from dishes where category_id = p_id and restaurant_id = p_restaurant_id) then
    raise exception 'category_has_dishes';
  end if;
  delete from menu_categories where id = p_id and restaurant_id = p_restaurant_id;
  if not found then
    raise exception 'category_not_found';
  end if;
end;
$$;

create or replace function rpc_admin_upsert_dish(
  p_restaurant_id uuid, p_id uuid, p_category_id uuid, p_name text,
  p_description text, p_price numeric, p_photo_url text, p_is_available boolean,
  p_detail_sections jsonb default null
)
returns dishes language plpgsql security definer set search_path = public as $$
declare v_row dishes;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'invalid_dish_name'; end if;
  if p_price is null or p_price < 0 then raise exception 'invalid_price'; end if;
  if p_detail_sections is not null and not valid_dish_detail_sections(p_detail_sections) then
    raise exception 'invalid_detail_sections';
  end if;
  if not exists (select 1 from menu_categories where id = p_category_id and restaurant_id = p_restaurant_id) then
    raise exception 'invalid_category';
  end if;
  if p_id is null then
    insert into dishes (restaurant_id, category_id, name, description, price, photo_url, is_available, detail_sections)
      values (p_restaurant_id, p_category_id, p_name, coalesce(p_description, ''), p_price, p_photo_url,
        coalesce(p_is_available, true), coalesce(p_detail_sections, '[]'::jsonb)) returning * into v_row;
  else
    update dishes set category_id = p_category_id, name = p_name, description = coalesce(p_description, ''),
      price = p_price, photo_url = p_photo_url, is_available = coalesce(p_is_available, is_available),
      detail_sections = coalesce(p_detail_sections, detail_sections)
      where id = p_id and restaurant_id = p_restaurant_id returning * into v_row;
    if v_row.id is null then raise exception 'dish_not_found'; end if;
  end if;
  return v_row;
end;
$$;

create or replace function rpc_admin_delete_dish(p_restaurant_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  delete from dishes where id = p_id and restaurant_id = p_restaurant_id;
  if not found then
    raise exception 'dish_not_found';
  end if;
end;
$$;

create or replace function rpc_admin_set_dish_availability(p_restaurant_id uuid, p_dish_id uuid, p_is_available boolean)
returns dishes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row dishes;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  update dishes set is_available = p_is_available
    where id = p_dish_id and restaurant_id = p_restaurant_id
    returning * into v_row;
  if v_row.id is null then
    raise exception 'dish_not_found';
  end if;
  return v_row;
end;
$$;

create or replace function rpc_admin_close_table_session(p_restaurant_id uuid, p_table_session_id uuid)
returns table_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row table_sessions;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

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

create or replace function rpc_admin_acknowledge_table_request(p_restaurant_id uuid, p_request_id uuid)
returns table_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row table_requests;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

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
  perform private.require_staff_role(p_restaurant_id, array['admin', 'kitchen']);

  select r.* into v_row
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    where r.id = p_round_id and t.restaurant_id = p_restaurant_id
    for update of r;
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

  if p_next_status = 'ready' and exists (
    select 1 from cart_items where order_round_id = p_round_id and prepared_at is null
  ) then
    raise exception 'items_not_prepared';
  end if;

  update order_rounds set status = p_next_status
    where id = p_round_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function rpc_admin_set_item_prepared(p_restaurant_id uuid, p_item_id uuid, p_prepared boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round order_rounds;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin', 'kitchen']);

  select r.* into v_round
    from cart_items ci
    join order_rounds r on r.id = ci.order_round_id
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    where ci.id = p_item_id and t.restaurant_id = p_restaurant_id
    for update of r;
  if v_round.id is null then
    raise exception 'item_not_found';
  end if;

  if v_round.status in ('ready', 'delivered') then
    raise exception 'round_already_ready';
  end if;

  update cart_items
    set prepared_at = case when p_prepared then now() else null end
    where id = p_item_id;

  if p_prepared and v_round.status = 'pending' then
    update order_rounds set status = 'preparing' where id = v_round.id;
    return 'preparing';
  end if;

  return v_round.status;
end;
$$;

create or replace function rpc_admin_get_sales_report(p_restaurant_id uuid, p_period text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_step interval;
  v_offset interval;
  v_prev_start timestamptz;
  v_result jsonb;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  case p_period
    when 'day' then
      v_start := date_trunc('day', now());
      v_end := v_start + interval '1 day';
      v_step := interval '1 hour';
      v_offset := interval '1 day';
    when 'week' then
      v_start := date_trunc('day', now()) - interval '6 days';
      v_end := date_trunc('day', now()) + interval '1 day';
      v_step := interval '1 day';
      v_offset := interval '7 days';
    when 'month' then
      v_start := date_trunc('day', now()) - interval '29 days';
      v_end := date_trunc('day', now()) + interval '1 day';
      v_step := interval '1 day';
      v_offset := interval '30 days';
    when 'year' then
      v_start := date_trunc('month', now()) - interval '11 months';
      v_end := date_trunc('month', now()) + interval '1 month';
      v_step := interval '1 month';
      v_offset := interval '12 months';
    else
      raise exception 'invalid_period';
  end case;
  v_prev_start := v_start - v_offset;

  with lines as (
    select r.id as round_id, r.submitted_at, ci.quantity, ci.unit_price_snapshot,
           d.name as dish, c.name as category, t.id as table_id
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    left join cart_items ci on ci.order_round_id = r.id
    left join dishes d on d.id = ci.dish_id
    left join menu_categories c on c.id = d.category_id
    where t.restaurant_id = p_restaurant_id
      and r.submitted_at >= v_prev_start and r.submitted_at < v_end
  ),
  cur as (select * from lines where submitted_at >= v_start),
  prev as (select * from lines where submitted_at < v_start),
  sessions as (
    select ts.closed_at, extract(epoch from ts.closed_at - ts.opened_at) / 60 as minutes
    from table_sessions ts
    join tables t on t.id = ts.table_id
    where t.restaurant_id = p_restaurant_id
      and ts.status = 'closed'
      and ts.closed_at >= v_prev_start and ts.closed_at < v_end
  ),
  k as (
    select
      (select coalesce(sum(quantity * unit_price_snapshot), 0) from cur) as revenue,
      (select coalesce(sum(quantity * unit_price_snapshot), 0) from prev) as prev_revenue,
      (select count(distinct round_id) from cur) as orders,
      (select count(distinct round_id) from prev) as prev_orders,
      (select coalesce(avg(minutes), 0) from sessions where closed_at >= v_start) as avg_table_minutes,
      (select coalesce(avg(minutes), 0) from sessions where closed_at < v_start) as prev_avg_table_minutes
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'revenue', k.revenue,
      'prev_revenue', k.prev_revenue,
      'orders', k.orders,
      'prev_orders', k.prev_orders,
      'avg_ticket', case when k.orders = 0 then 0 else round(k.revenue / k.orders, 2) end,
      'prev_avg_ticket', case when k.prev_orders = 0 then 0 else round(k.prev_revenue / k.prev_orders, 2) end,
      'avg_table_minutes', round(k.avg_table_minutes::numeric, 1),
      'prev_avg_table_minutes', round(k.prev_avg_table_minutes::numeric, 1),
      'open_tables', (
        select count(*) from table_sessions ts
        join tables t on t.id = ts.table_id
        where t.restaurant_id = p_restaurant_id and ts.status = 'open'
      )
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'bucket', b.bucket,
        'revenue', (
          select coalesce(sum(quantity * unit_price_snapshot), 0) from cur
          where submitted_at >= b.bucket and submitted_at < b.bucket + v_step
        ),
        'prev_revenue', (
          select coalesce(sum(quantity * unit_price_snapshot), 0) from prev
          where submitted_at >= b.bucket - v_offset and submitted_at < b.bucket - v_offset + v_step
        )
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(v_start, v_end - v_step, v_step) as b(bucket)
    ),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('category', x.category, 'revenue', x.revenue) order by x.revenue desc), '[]'::jsonb)
      from (
        select category, sum(quantity * unit_price_snapshot) as revenue
        from cur where category is not null
        group by category
      ) x
    ),
    'top_dishes', (
      select coalesce(jsonb_agg(jsonb_build_object('dish', x.dish, 'quantity', x.quantity, 'revenue', x.revenue) order by x.quantity desc, x.dish), '[]'::jsonb)
      from (
        select dish, sum(quantity) as quantity, sum(quantity * unit_price_snapshot) as revenue
        from cur where dish is not null
        group by dish
        order by sum(quantity) desc, dish
        limit 5
      ) x
    ),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', x.table_label, 'sessions', x.sessions, 'revenue', x.revenue, 'avg_minutes', x.avg_minutes
      ) order by x.revenue desc, x.table_label), '[]'::jsonb)
      from (
        select t.label as table_label,
               count(distinct ts.id) as sessions,
               coalesce((select sum(c2.quantity * c2.unit_price_snapshot) from cur c2 where c2.table_id = t.id), 0) as revenue,
               round(coalesce(avg(extract(epoch from coalesce(ts.closed_at, now()) - ts.opened_at) / 60), 0)::numeric, 0) as avg_minutes
        from table_sessions ts
        join tables t on t.id = ts.table_id
        where t.restaurant_id = p_restaurant_id
          and ts.opened_at < v_end
          and coalesce(ts.closed_at, now()) >= v_start
        group by t.id, t.label
      ) x
    )
  )
  into v_result
  from k;

  return v_result;
end;
$$;

create or replace function rpc_admin_create_table(p_restaurant_id uuid, p_label text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  -- Serializa creaciones del mismo restaurante para que el chequeo de nombre no compita.
  perform pg_advisory_xact_lock(hashtext('tables:' || p_restaurant_id::text));

  insert into tables (restaurant_id, label)
    values (p_restaurant_id, admin_check_table_label(p_restaurant_id, p_label, null))
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function rpc_admin_rename_table(p_restaurant_id uuid, p_table_id uuid, p_label text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  perform admin_lock_table(p_restaurant_id, p_table_id);
  perform pg_advisory_xact_lock(hashtext('tables:' || p_restaurant_id::text));

  update tables set label = admin_check_table_label(p_restaurant_id, p_label, p_table_id)
    where id = p_table_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function rpc_admin_set_table_availability(p_restaurant_id uuid, p_table_id uuid, p_availability text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  perform admin_lock_table(p_restaurant_id, p_table_id);
  if p_availability not in ('available', 'reserved', 'unavailable') then
    raise exception 'invalid_availability';
  end if;
  if exists (select 1 from table_sessions where table_id = p_table_id and status = 'open') then
    raise exception 'table_occupied';
  end if;

  update tables set availability = p_availability
    where id = p_table_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function rpc_admin_regenerate_table_qr(p_restaurant_id uuid, p_table_id uuid)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  perform admin_lock_table(p_restaurant_id, p_table_id);
  if exists (select 1 from table_sessions where table_id = p_table_id and status = 'open') then
    raise exception 'table_occupied';
  end if;

  update tables set qr_token = gen_random_uuid()
    where id = p_table_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function rpc_admin_delete_table(p_restaurant_id uuid, p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  perform admin_lock_table(p_restaurant_id, p_table_id);
  if exists (select 1 from table_sessions where table_id = p_table_id) then
    raise exception 'table_has_history';
  end if;

  delete from tables where id = p_table_id;
end;
$$;

-- ============================================================================
-- 4. RPC del comensal: bloqueo por restaurante suspendido
-- ============================================================================

create or replace function rpc_get_table(p_qr_token uuid)
returns table (
  table_id uuid, table_label text, restaurant_id uuid, restaurant_name text,
  restaurant_slug text, availability text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_id uuid;
  v_label text;
  v_restaurant_id uuid;
  v_name text;
  v_slug text;
  v_availability text;
  v_status text;
begin
  select t.id, t.label, r.id, r.name, r.slug, t.availability, r.status
    into v_table_id, v_label, v_restaurant_id, v_name, v_slug, v_availability, v_status
    from tables t
    join restaurants r on r.id = t.restaurant_id
    where t.qr_token = p_qr_token;

  if v_table_id is null then
    return;
  end if;
  if v_status <> 'active' then
    raise exception 'restaurant_suspended';
  end if;

  return query select v_table_id, v_label, v_restaurant_id, v_name, v_slug, v_availability;
end;
$$;

create or replace function rpc_start_session(p_qr_token uuid, p_nickname text)
returns table (
  table_session_id uuid,
  diner_id uuid,
  device_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table tables;
  v_session_id uuid;
  v_diner_id uuid;
  v_device_token uuid;
begin
  -- Bloquea la mesa: serializa escaneos concurrentes contra cambios de disponibilidad.
  select * into v_table from tables where qr_token = p_qr_token for update;
  if v_table.id is null then
    raise exception 'invalid_qr_token';
  end if;

  perform private.require_active_restaurant(v_table.restaurant_id);

  if v_table.availability = 'unavailable' then
    raise exception 'table_unavailable';
  end if;

  if v_table.availability = 'reserved' then
    update tables set availability = 'available' where id = v_table.id;
  end if;

  insert into table_sessions (table_id, status) values (v_table.id, 'open')
    on conflict (table_id) where status = 'open' do nothing
    returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id from table_sessions
      where table_id = v_table.id and status = 'open'
      limit 1;
  end if;

  insert into diners (table_session_id, nickname)
    values (v_session_id, p_nickname)
    returning diners.id, diners.device_token into v_diner_id, v_device_token;

  return query select v_session_id, v_diner_id, v_device_token;
end;
$$;

create or replace function rpc_resume_session(p_device_token uuid)
returns table (
  table_session_id uuid,
  diner_id uuid,
  nickname text,
  session_status text,
  table_label text,
  restaurant_name text,
  restaurant_slug text,
  qr_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_session_id uuid;
  v_diner_id uuid;
  v_nickname text;
  v_session_status text;
  v_table_label text;
  v_restaurant_name text;
  v_restaurant_slug text;
  v_qr_token uuid;
  v_restaurant_status text;
begin
  select ts.id, d.id, d.nickname, ts.status, t.label, r.name, r.slug, t.qr_token, r.status
    into v_table_session_id, v_diner_id, v_nickname, v_session_status, v_table_label,
         v_restaurant_name, v_restaurant_slug, v_qr_token, v_restaurant_status
    from diners d
    join table_sessions ts on ts.id = d.table_session_id
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where d.device_token = p_device_token;

  if v_table_session_id is null then
    return;
  end if;
  if v_restaurant_status <> 'active' then
    raise exception 'restaurant_suspended';
  end if;

  return query select v_table_session_id, v_diner_id, v_nickname, v_session_status,
    v_table_label, v_restaurant_name, v_restaurant_slug, v_qr_token;
end;
$$;

create or replace function rpc_add_cart_item(
  p_device_token uuid, p_dish_id uuid, p_quantity int,
  p_notes text default '', p_selections jsonb default '{}'::jsonb
)
returns cart_items language plpgsql security definer set search_path = public as $$
declare
  v_diner_id uuid;
  v_session_id uuid;
  v_restaurant_id uuid;
  v_dish dishes;
  v_price numeric;
  v_row cart_items;
  s jsonb;
  i jsonb;
  choices jsonb;
  choice text;
  selection_key text;
  selected_labels text[];
  v_notes text := '';
begin
  select d.id, d.table_session_id into v_diner_id, v_session_id from diners d where d.device_token = p_device_token;
  if v_diner_id is null then raise exception 'invalid_device_token'; end if;
  select t.restaurant_id into v_restaurant_id from table_sessions ts join tables t on t.id = ts.table_id
    where ts.id = v_session_id and ts.status = 'open' for share of ts;
  if v_restaurant_id is null then raise exception 'session_closed'; end if;
  perform private.require_active_restaurant(v_restaurant_id);
  select * into v_dish from dishes where id = p_dish_id and restaurant_id = v_restaurant_id for share;
  if v_dish.id is null then raise exception 'dish_not_found'; end if;
  if not v_dish.is_available then raise exception 'dish_unavailable'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid_quantity'; end if;
  if length(coalesce(p_notes, '')) > 140 then raise exception 'notes_too_long'; end if;
  if jsonb_typeof(p_selections) is distinct from 'object' then raise exception 'invalid_selections'; end if;
  -- Solo se aceptan identificadores de secciones seleccionables del plato.
  for selection_key in select jsonb_object_keys(p_selections) loop
    if not exists (select 1 from jsonb_array_elements(v_dish.detail_sections) e
      where e->>'id' = selection_key and e->>'kind' in ('single', 'multiple')) then
      raise exception 'invalid_selections';
    end if;
  end loop;
  v_price := v_dish.price;
  for s in select value from jsonb_array_elements(v_dish.detail_sections) loop
    if s->>'kind' = 'notes' and (s->>'required')::boolean and length(trim(coalesce(p_notes, ''))) = 0 then
      raise exception 'required_notes';
    end if;
    if s->>'kind' not in ('single', 'multiple') then continue; end if;
    choices := coalesce(p_selections->(s->>'id'), '[]'::jsonb);
    if jsonb_typeof(choices) is distinct from 'array' then raise exception 'invalid_selections'; end if;
    if exists (select 1 from jsonb_array_elements(choices) c where jsonb_typeof(c) <> 'string') then raise exception 'invalid_selections'; end if;
    if (s->>'required')::boolean and jsonb_array_length(choices) = 0 then raise exception 'required_selection'; end if;
    if s->>'kind' = 'single' and jsonb_array_length(choices) > 1 then raise exception 'invalid_selections'; end if;
    if (select count(distinct value) from jsonb_array_elements_text(choices)) <> jsonb_array_length(choices) then
      raise exception 'invalid_selections';
    end if;
    for choice in select value from jsonb_array_elements_text(choices) loop
      if not exists (select 1 from jsonb_array_elements(s->'items') e where e->>'id' = choice) then
        raise exception 'invalid_selections';
      end if;
    end loop;
    selected_labels := '{}';
    for i in select value from jsonb_array_elements(s->'items') loop
      if choices ? (i->>'id') then
        v_price := v_price + (i->>'price')::numeric;
        selected_labels := array_append(selected_labels, i->>'label');
      end if;
    end loop;
    if cardinality(selected_labels) > 0 then
      v_notes := concat_ws(E'\n', nullif(v_notes, ''), (s->>'title') || ': ' || array_to_string(selected_labels, ', '));
    end if;
  end loop;
  v_notes := concat_ws(E'\n', nullif(v_notes, ''), nullif(trim(coalesce(p_notes, '')), ''));
  insert into cart_items (table_session_id, dish_id, diner_id, quantity, notes, unit_price_snapshot)
    values (v_session_id, p_dish_id, v_diner_id, p_quantity, v_notes, v_price) returning * into v_row;
  return v_row;
end;
$$;

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
  if not exists (
    select 1 from table_sessions ts
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where ts.id = v_session_id and r.status = 'active'
  ) then
    raise exception 'restaurant_suspended';
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
  if not exists (
    select 1 from table_sessions ts
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where ts.id = v_session_id and r.status = 'active'
  ) then
    raise exception 'restaurant_suspended';
  end if;

  delete from cart_items
    where id = p_cart_item_id and table_session_id = v_session_id and status = 'in_cart'
    returning id into v_deleted;

  if v_deleted is null then
    raise exception 'cart_item_not_found';
  end if;
end;
$$;

create or replace function rpc_get_cart(p_device_token uuid)
returns table (
  id uuid,
  dish_id uuid,
  diner_id uuid,
  quantity int,
  notes text,
  unit_price_snapshot numeric(10,2),
  status text,
  order_round_id uuid,
  table_session_id uuid,
  dish_name text,
  diner_nickname text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  select diners.table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
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
      ci.id,
      ci.dish_id,
      ci.diner_id,
      ci.quantity,
      ci.notes,
      ci.unit_price_snapshot,
      ci.status,
      ci.order_round_id,
      ci.table_session_id,
      d.name,
      dn.nickname
    from cart_items ci
    join dishes d on d.id = ci.dish_id
    join diners dn on dn.id = ci.diner_id
    where ci.table_session_id = v_session_id
      and ci.status = 'in_cart'
    order by ci.created_at;
end;
$$;

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
  if not exists (
    select 1 from table_sessions ts
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where ts.id = v_session_id and r.status = 'active'
  ) then
    raise exception 'restaurant_suspended';
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
  if not exists (
    select 1 from table_sessions ts
    join tables t on t.id = ts.table_id
    join restaurants r on r.id = t.restaurant_id
    where ts.id = v_session_id and r.status = 'active'
  ) then
    raise exception 'restaurant_suspended';
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
      r.id, r.submitted_at, r.status, r.notes,
      ci.id, ci.dish_id, d.name, ci.quantity, ci.notes, ci.unit_price_snapshot
    from order_rounds r
    join cart_items ci on ci.order_round_id = r.id
    join dishes d on d.id = ci.dish_id
    where r.id = (
      select recent.id from order_rounds recent
      where recent.table_session_id = v_session_id
      order by recent.submitted_at desc, recent.id desc
      limit 1
    )
    order by ci.created_at, ci.id;
end;
$$;

-- ============================================================================
-- 5. RPC de plataforma (platform_admin) y de equipo (admin del restaurante)
-- ============================================================================

create or replace function rpc_platform_list_restaurants()
returns table (id uuid, name text, slug text, theme text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_platform_admin();
  return query
    select r.id, r.name, r.slug, r.theme, r.status, r.created_at
    from restaurants r
    order by r.created_at desc;
end;
$$;

create or replace function rpc_platform_create_restaurant(
  p_name text, p_slug text, p_theme text, p_admin_user_id uuid
)
returns restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row restaurants;
begin
  perform private.require_platform_admin();

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'invalid_restaurant_name';
  end if;
  if length(trim(coalesce(p_slug, ''))) = 0 then
    raise exception 'invalid_slug';
  end if;
  if coalesce(p_theme, '') not in ('brasa', 'mar', 'cafe', 'huerta') then
    raise exception 'invalid_theme';
  end if;
  if exists (select 1 from restaurants where slug = p_slug) then
    raise exception 'slug_taken';
  end if;

  insert into restaurants (name, slug, theme)
    values (p_name, p_slug, p_theme)
    returning * into v_row;

  insert into restaurant_staff (restaurant_id, user_id, role)
    values (v_row.id, p_admin_user_id, 'admin');

  return v_row;
end;
$$;

create or replace function rpc_platform_add_restaurant_admin(p_restaurant_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_platform_admin();

  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'restaurant_not_found';
  end if;

  insert into restaurant_staff (restaurant_id, user_id, role)
    values (p_restaurant_id, p_user_id, 'admin')
    on conflict (restaurant_id, user_id) do update set role = 'admin';
end;
$$;

create or replace function rpc_platform_set_restaurant_status(p_restaurant_id uuid, p_status text)
returns restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row restaurants;
begin
  perform private.require_platform_admin();

  if p_status not in ('active', 'suspended') then
    raise exception 'invalid_status';
  end if;

  update restaurants set status = p_status where id = p_restaurant_id returning * into v_row;
  if v_row.id is null then
    raise exception 'restaurant_not_found';
  end if;
  return v_row;
end;
$$;

create or replace function rpc_admin_list_staff(p_restaurant_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);
  return query
    select rs.user_id, u.email::text, rs.role, rs.created_at
    from restaurant_staff rs
    join auth.users u on u.id = rs.user_id
    where rs.restaurant_id = p_restaurant_id
    order by rs.role, u.email;
end;
$$;

create or replace function rpc_admin_add_kitchen_staff(p_restaurant_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  if exists (
    select 1 from restaurant_staff
    where restaurant_id = p_restaurant_id and user_id = p_user_id and role = 'admin'
  ) then
    raise exception 'cannot_modify_admin';
  end if;

  insert into restaurant_staff (restaurant_id, user_id, role)
    values (p_restaurant_id, p_user_id, 'kitchen')
    on conflict (restaurant_id, user_id) do update set role = 'kitchen';
end;
$$;

create or replace function rpc_admin_remove_kitchen_staff(p_restaurant_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  delete from restaurant_staff
    where restaurant_id = p_restaurant_id and user_id = p_user_id and role = 'kitchen';
  if not found then
    raise exception 'staff_not_found';
  end if;
end;
$$;

-- Puerta de autorización para resetear la contraseña de una cuenta de
-- cocina: la Server Action solo puede tocar auth.admin.updateUserById
-- después de que esto pase. Nunca confía en lo que manda el formulario
-- (restaurant_id/user_id), lo valida contra la sesión (auth.uid()) y la
-- membresía real en restaurant_staff.
create or replace function rpc_admin_confirm_kitchen_staff(p_restaurant_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.require_staff_role(p_restaurant_id, array['admin']);

  if not exists (
    select 1 from restaurant_staff
    where restaurant_id = p_restaurant_id and user_id = p_user_id and role = 'kitchen'
  ) then
    raise exception 'staff_not_found';
  end if;
end;
$$;

-- ============================================================================
-- 6. Grants: el staff siempre está autenticado; se revoca anon de las RPC
--    de admin/KDS/plataforma/equipo. Las RPC del comensal siguen abiertas
--    a anon (no tiene login).
-- ============================================================================

revoke execute on function rpc_admin_get_tables(uuid) from public, anon;
revoke execute on function rpc_admin_get_pending_requests(uuid) from public, anon;
revoke execute on function rpc_admin_get_active_tickets(uuid) from public, anon;
revoke execute on function rpc_admin_get_delivered_tickets(uuid) from public, anon;
revoke execute on function rpc_admin_upsert_category(uuid, uuid, text, int) from public, anon;
revoke execute on function rpc_admin_delete_category(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_upsert_dish(uuid, uuid, uuid, text, text, numeric, text, boolean, jsonb) from public, anon;
revoke execute on function rpc_admin_delete_dish(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_set_dish_availability(uuid, uuid, boolean) from public, anon;
revoke execute on function rpc_admin_close_table_session(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_acknowledge_table_request(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_advance_order_round(uuid, uuid, text) from public, anon;
revoke execute on function rpc_admin_set_item_prepared(uuid, uuid, boolean) from public, anon;
revoke execute on function rpc_admin_get_sales_report(uuid, text) from public, anon;
revoke execute on function rpc_admin_create_table(uuid, text) from public, anon;
revoke execute on function rpc_admin_rename_table(uuid, uuid, text) from public, anon;
revoke execute on function rpc_admin_set_table_availability(uuid, uuid, text) from public, anon;
revoke execute on function rpc_admin_regenerate_table_qr(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_delete_table(uuid, uuid) from public, anon;

-- Funciones nuevas: este proyecto tiene "alter default privileges" que
-- concede execute a anon/authenticated (y PUBLIC) en toda función pública
-- recién creada, así que hay que revocarlo explícitamente antes de conceder
-- solo a authenticated (mismo motivo que el bloque de arriba).
revoke execute on function rpc_platform_list_restaurants() from public, anon;
revoke execute on function rpc_platform_create_restaurant(text, text, text, uuid) from public, anon;
revoke execute on function rpc_platform_add_restaurant_admin(uuid, uuid) from public, anon;
revoke execute on function rpc_platform_set_restaurant_status(uuid, text) from public, anon;
revoke execute on function rpc_admin_list_staff(uuid) from public, anon;
revoke execute on function rpc_admin_add_kitchen_staff(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_remove_kitchen_staff(uuid, uuid) from public, anon;
revoke execute on function rpc_admin_confirm_kitchen_staff(uuid, uuid) from public, anon;

grant execute on function rpc_platform_list_restaurants() to authenticated;
grant execute on function rpc_platform_create_restaurant(text, text, text, uuid) to authenticated;
grant execute on function rpc_platform_add_restaurant_admin(uuid, uuid) to authenticated;
grant execute on function rpc_platform_set_restaurant_status(uuid, text) to authenticated;
grant execute on function rpc_admin_list_staff(uuid) to authenticated;
grant execute on function rpc_admin_add_kitchen_staff(uuid, uuid) to authenticated;
grant execute on function rpc_admin_remove_kitchen_staff(uuid, uuid) to authenticated;
grant execute on function rpc_admin_confirm_kitchen_staff(uuid, uuid) to authenticated;

-- ============================================================================
-- 7. Lectura pública de menú: solo si el restaurante está activo
-- ============================================================================

drop policy "public read menu_categories" on menu_categories;
create policy "public read menu_categories" on menu_categories
  for select using (
    exists (select 1 from restaurants r where r.id = menu_categories.restaurant_id and r.status = 'active')
  );

drop policy "public read dishes" on dishes;
create policy "public read dishes" on dishes
  for select using (
    exists (select 1 from restaurants r where r.id = dishes.restaurant_id and r.status = 'active')
  );
