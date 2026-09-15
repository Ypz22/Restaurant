-- C1: diners.device_token is the sole write capability credential in this app.
-- Public SELECT on diners let anyone with the (publicly shipped) anon key
-- harvest every active device_token via GET /rest/v1/diners?select=*.
-- Drop the policy entirely: diners keeps RLS enabled with zero policies,
-- so anon/authenticated get default-deny reads. SECURITY DEFINER RPCs still
-- work fine since they bypass RLS.
drop policy "public read diners" on diners;

-- C2: tables.qr_token is the join capability for a table. Public SELECT let
-- a remote client read every table's qr_token and join any table without
-- ever scanning its physical QR code. Nothing in the client code reads
-- `tables` directly (getTableByQrToken goes through rpc_get_table, which is
-- SECURITY DEFINER and bypasses RLS), so this is safe to drop outright.
drop policy "public read tables" on tables;

-- getCart previously did a PostgREST embedded join
-- (.from('cart_items').select('*, dishes(name), diners(nickname))'), which
-- required a readable `diners` row. Replace it with a SECURITY DEFINER RPC
-- that resolves the caller's session from their device_token (same pattern
-- as every other RPC in this codebase) and returns the joined cart rows.
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
  -- Qualified as diners.table_session_id: the RETURNS TABLE column of the
  -- same name is in scope as a PL/pgSQL variable here, so a bare reference
  -- is ambiguous between that output variable and the table column.
  select diners.table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
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

grant execute on function rpc_get_cart(uuid) to anon, authenticated;
