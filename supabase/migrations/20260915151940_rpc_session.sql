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

  select id into v_session_id from table_sessions
    where table_id = v_table_id and status = 'open'
    limit 1;

  if v_session_id is null then
    insert into table_sessions (table_id, status) values (v_table_id, 'open')
      returning id into v_session_id;
  end if;

  insert into diners (table_session_id, nickname)
    values (v_session_id, p_nickname);

  select diners.id, diners.device_token into v_diner_id, v_device_token
    from diners
    where diners.table_session_id = v_session_id
    order by diners.created_at desc
    limit 1;

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
  restaurant_slug text
)
language sql
security definer
set search_path = public
as $$
  select ts.id, d.id, d.nickname, ts.status, t.label, r.name, r.slug
  from diners d
  join table_sessions ts on ts.id = d.table_session_id
  join tables t on t.id = ts.table_id
  join restaurants r on r.id = t.restaurant_id
  where d.device_token = p_device_token;
$$;

grant execute on function rpc_start_session(uuid, text) to anon, authenticated;
grant execute on function rpc_resume_session(uuid) to anon, authenticated;
