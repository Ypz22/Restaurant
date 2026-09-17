-- Pestaña "Entregados" en el KDS (issue de usabilidad): las comandas entregadas
-- salían de rpc_admin_get_active_tickets sin dejar rastro visible. Se agrega
-- una consulta separada acotada a las últimas 3 horas, mismo patrón security
-- definer scoped por restaurant_id que el resto de rpc_admin_*.

create function rpc_admin_get_delivered_tickets(p_restaurant_id uuid)
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
  where t.restaurant_id = p_restaurant_id and r.status = 'delivered'
    and r.submitted_at > now() - interval '3 hours'
  order by r.submitted_at desc, ci.created_at;
$$;

grant execute on function rpc_admin_get_delivered_tickets(uuid) to anon, authenticated;
