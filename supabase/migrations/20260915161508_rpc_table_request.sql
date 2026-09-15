create or replace function rpc_create_table_request(p_device_token uuid, p_type text)
returns table_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_row table_requests;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if p_type not in ('llamar_mesero', 'agua') then
    raise exception 'invalid_request_type';
  end if;

  select * into v_row from table_requests
    where table_session_id = v_session_id and type = p_type and status = 'pending'
    limit 1;

  if v_row.id is not null then
    return v_row;
  end if;

  insert into table_requests (table_session_id, type, status)
    values (v_session_id, p_type, 'pending')
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function rpc_create_table_request(uuid, text) to anon, authenticated;
