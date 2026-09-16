-- Dashboard de ventas del admin (KPIs del día + platos más vendidos).
-- Mismo patrón que el resto de rpc_admin_*: security definer, scoped por
-- restaurant_id, sin chequeo de identidad todavía.

create or replace function rpc_admin_get_sales_summary(p_restaurant_id uuid)
returns table (total_revenue numeric, order_count bigint, avg_ticket numeric, open_tables bigint)
language sql
security definer
set search_path = public
as $$
  with today_rounds as (
    select r.id
    from order_rounds r
    join table_sessions ts on ts.id = r.table_session_id
    join tables t on t.id = ts.table_id
    where t.restaurant_id = p_restaurant_id
      and r.submitted_at::date = current_date
  ),
  today_revenue as (
    select coalesce(sum(ci.quantity * ci.unit_price_snapshot), 0) as revenue
    from cart_items ci
    where ci.order_round_id in (select id from today_rounds)
  )
  select
    tr.revenue,
    (select count(*) from today_rounds),
    case when (select count(*) from today_rounds) = 0 then 0
      else tr.revenue / (select count(*) from today_rounds)
    end,
    (select count(*) from table_sessions ts2
       join tables t2 on t2.id = ts2.table_id
       where t2.restaurant_id = p_restaurant_id and ts2.status = 'open')
  from today_revenue tr;
$$;

grant execute on function rpc_admin_get_sales_summary(uuid) to anon, authenticated;

create or replace function rpc_admin_get_top_dishes(p_restaurant_id uuid, p_limit int default 5)
returns table (dish_name text, total_quantity bigint, total_revenue numeric)
language sql
security definer
set search_path = public
as $$
  select d.name, sum(ci.quantity), sum(ci.quantity * ci.unit_price_snapshot)
  from cart_items ci
  join order_rounds r on r.id = ci.order_round_id
  join table_sessions ts on ts.id = r.table_session_id
  join tables t on t.id = ts.table_id
  join dishes d on d.id = ci.dish_id
  where t.restaurant_id = p_restaurant_id
  group by d.name
  order by sum(ci.quantity) desc
  limit coalesce(p_limit, 5);
$$;

grant execute on function rpc_admin_get_top_dishes(uuid, int) to anon, authenticated;
