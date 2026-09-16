-- Mejoras de admin/KDS (spec 2026-09-16-admin-ui-mejoras-design.md):
--   1. Checklist por plato en KDS (cart_items.prepared_at).
--   2. Solicitudes pendientes con table_id para resaltar la card de la mesa.
--   3. Reporte de ventas por periodo para el dashboard con gráficas.
-- Mismo patrón que el resto de rpc_admin_*: security definer, scoped por
-- restaurant_id, sin chequeo de identidad todavía.

-- 1. KDS checklist ---------------------------------------------------------

alter table cart_items add column prepared_at timestamptz;

drop function if exists rpc_admin_get_active_tickets(uuid);

create function rpc_admin_get_active_tickets(p_restaurant_id uuid)
returns table (
  round_id uuid, table_label text, submitted_at timestamptz, status text, kitchen_notes text,
  item_id uuid, dish_name text, quantity int, item_notes text, prepared_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, t.label, r.submitted_at, r.status, r.notes,
         ci.id, d.name, ci.quantity, ci.notes, ci.prepared_at
  from order_rounds r
  join table_sessions ts on ts.id = r.table_session_id
  join tables t on t.id = ts.table_id
  left join cart_items ci on ci.order_round_id = r.id
  left join dishes d on d.id = ci.dish_id
  where t.restaurant_id = p_restaurant_id and r.status in ('pending', 'preparing', 'ready')
  order by r.submitted_at, ci.created_at;
$$;

grant execute on function rpc_admin_get_active_tickets(uuid) to anon, authenticated;

create or replace function rpc_admin_set_item_prepared(p_restaurant_id uuid, p_item_id uuid, p_prepared boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round order_rounds;
begin
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

grant execute on function rpc_admin_set_item_prepared(uuid, uuid, boolean) to anon, authenticated;

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

-- 2. Solicitudes con table_id ---------------------------------------------

drop function if exists rpc_admin_get_pending_requests(uuid);

create function rpc_admin_get_pending_requests(p_restaurant_id uuid)
returns table (id uuid, table_id uuid, table_label text, type text, reason text, notes text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select tr.id, t.id, t.label, tr.type, tr.reason, tr.notes, tr.created_at
  from table_requests tr
  join table_sessions ts on ts.id = tr.table_session_id
  join tables t on t.id = ts.table_id
  where t.restaurant_id = p_restaurant_id and tr.status = 'pending'
  order by tr.created_at;
$$;

grant execute on function rpc_admin_get_pending_requests(uuid) to anon, authenticated;

-- 3. Reporte de ventas -----------------------------------------------------

drop function if exists rpc_admin_get_sales_summary(uuid);
drop function if exists rpc_admin_get_top_dishes(uuid, int);

create or replace function rpc_admin_get_sales_report(p_restaurant_id uuid, p_period text)
returns jsonb
language plpgsql
stable
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

grant execute on function rpc_admin_get_sales_report(uuid, text) to anon, authenticated;
