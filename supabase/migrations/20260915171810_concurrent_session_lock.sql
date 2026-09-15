-- I1: rpc_start_session's check-then-insert (select ... where status = 'open'
-- limit 1, then insert if null) has no lock and no unique constraint behind
-- it, so two diners scanning the same QR near-simultaneously can each pass
-- the "no open session" check and insert their own table_sessions row,
-- splitting the group cart into two isolated sessions.
--
-- A partial unique index makes "at most one open session per table" a hard
-- database invariant, and an insert-first-then-fallback-select pattern
-- (relying on ON CONFLICT) makes the RPC race-safe: whichever concurrent
-- insert loses the race gets a conflict instead of a second open session,
-- and falls back to reading the winner's row.
create unique index table_sessions_one_open_per_table
  on table_sessions (table_id)
  where status = 'open';

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
  v_table_id uuid;
  v_session_id uuid;
  v_diner_id uuid;
  v_device_token uuid;
begin
  select id into v_table_id from tables where qr_token = p_qr_token;
  if v_table_id is null then
    raise exception 'invalid_qr_token';
  end if;

  insert into table_sessions (table_id, status) values (v_table_id, 'open')
    on conflict (table_id) where status = 'open' do nothing
    returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id from table_sessions
      where table_id = v_table_id and status = 'open'
      limit 1;
  end if;

  insert into diners (table_session_id, nickname)
    values (v_session_id, p_nickname)
    returning diners.id, diners.device_token into v_diner_id, v_device_token;

  return query select v_session_id, v_diner_id, v_device_token;
end;
$$;

grant execute on function rpc_start_session(uuid, text) to anon, authenticated;
