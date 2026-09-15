-- I2: session resume never validated that the resumed session belongs to the
-- table the QR/URL actually points at. A stale device_token from a previous
-- visit to a DIFFERENT table (or restaurant) would silently resume the
-- customer into the wrong session. Expose the table's qr_token from
-- rpc_resume_session so the client can compare it against the qr_token in
-- the URL (params.tableId, per this app's routing convention) and reject a
-- mismatch.
drop function if exists rpc_resume_session(uuid);

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
language sql
security definer
set search_path = public
as $$
  select ts.id, d.id, d.nickname, ts.status, t.label, r.name, r.slug, t.qr_token
  from diners d
  join table_sessions ts on ts.id = d.table_session_id
  join tables t on t.id = ts.table_id
  join restaurants r on r.id = t.restaurant_id
  where d.device_token = p_device_token;
$$;

grant execute on function rpc_resume_session(uuid) to anon, authenticated;
