create or replace function rpc_get_table(p_qr_token uuid)
returns table (
  table_id uuid,
  table_label text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.label, r.id, r.name, r.slug
  from tables t
  join restaurants r on r.id = t.restaurant_id
  where t.qr_token = p_qr_token;
$$;

grant execute on function rpc_get_table(uuid) to anon, authenticated;
