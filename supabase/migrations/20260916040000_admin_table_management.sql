-- Gestión de mesas desde el admin y estados de mesa
-- (spec 2026-09-16-gestion-mesas-design.md).
-- availability guarda la marca manual del staff; "ocupada" se deriva de la
-- sesión abierta. Mismo patrón que el resto de rpc_admin_*: security definer,
-- scoped por restaurant_id, sin chequeo de identidad todavía.

alter table tables add column availability text not null default 'available'
  check (availability in ('available', 'reserved', 'unavailable'));

-- Lado comensal ------------------------------------------------------------

drop function if exists rpc_get_table(uuid);

create function rpc_get_table(p_qr_token uuid)
returns table (
  table_id uuid,
  table_label text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  availability text
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.label, r.id, r.name, r.slug, t.availability
  from tables t
  join restaurants r on r.id = t.restaurant_id
  where t.qr_token = p_qr_token;
$$;

grant execute on function rpc_get_table(uuid) to anon, authenticated;

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

grant execute on function rpc_start_session(uuid, text) to anon, authenticated;

-- Admin ----------------------------------------------------------------------

drop function if exists rpc_admin_get_tables(uuid);

create function rpc_admin_get_tables(p_restaurant_id uuid)
returns table (id uuid, label text, qr_token uuid, availability text, session_id uuid, opened_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select t.id, t.label, t.qr_token, t.availability, ts.id as session_id, ts.opened_at
  from tables t
  left join table_sessions ts on ts.table_id = t.id and ts.status = 'open'
  where t.restaurant_id = p_restaurant_id
  order by t.label;
$$;

grant execute on function rpc_admin_get_tables(uuid) to anon, authenticated;

-- Valida el nombre y que no exista otra mesa con el mismo en el restaurante.
create or replace function admin_check_table_label(p_restaurant_id uuid, p_label text, p_exclude_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
begin
  if v_label = '' or length(v_label) > 40 then
    raise exception 'invalid_label';
  end if;
  if exists (
    select 1 from tables
    where restaurant_id = p_restaurant_id
      and lower(btrim(label)) = lower(v_label)
      and id is distinct from p_exclude_id
  ) then
    raise exception 'label_taken';
  end if;
  return v_label;
end;
$$;

revoke execute on function admin_check_table_label(uuid, text, uuid) from public, anon, authenticated;

-- Bloquea y devuelve la mesa si pertenece al restaurante.
create or replace function admin_lock_table(p_restaurant_id uuid, p_table_id uuid)
returns tables
language plpgsql
set search_path = public
as $$
declare
  v_table tables;
begin
  select * into v_table from tables
    where id = p_table_id and restaurant_id = p_restaurant_id
    for update;
  if v_table.id is null then
    raise exception 'table_not_found';
  end if;
  return v_table;
end;
$$;

revoke execute on function admin_lock_table(uuid, uuid) from public, anon, authenticated;

create or replace function rpc_admin_create_table(p_restaurant_id uuid, p_label text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'restaurant_not_found';
  end if;
  -- Serializa creaciones del mismo restaurante para que el chequeo de nombre no compita.
  perform pg_advisory_xact_lock(hashtext('tables:' || p_restaurant_id::text));

  insert into tables (restaurant_id, label)
    values (p_restaurant_id, admin_check_table_label(p_restaurant_id, p_label, null))
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_admin_create_table(uuid, text) to anon, authenticated;

create or replace function rpc_admin_rename_table(p_restaurant_id uuid, p_table_id uuid, p_label text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
  perform admin_lock_table(p_restaurant_id, p_table_id);
  perform pg_advisory_xact_lock(hashtext('tables:' || p_restaurant_id::text));

  update tables set label = admin_check_table_label(p_restaurant_id, p_label, p_table_id)
    where id = p_table_id
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function rpc_admin_rename_table(uuid, uuid, text) to anon, authenticated;

create or replace function rpc_admin_set_table_availability(p_restaurant_id uuid, p_table_id uuid, p_availability text)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
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

grant execute on function rpc_admin_set_table_availability(uuid, uuid, text) to anon, authenticated;

create or replace function rpc_admin_regenerate_table_qr(p_restaurant_id uuid, p_table_id uuid)
returns tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tables;
begin
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

grant execute on function rpc_admin_regenerate_table_qr(uuid, uuid) to anon, authenticated;

create or replace function rpc_admin_delete_table(p_restaurant_id uuid, p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform admin_lock_table(p_restaurant_id, p_table_id);
  if exists (select 1 from table_sessions where table_id = p_table_id) then
    raise exception 'table_has_history';
  end if;

  delete from tables where id = p_table_id;
end;
$$;

grant execute on function rpc_admin_delete_table(uuid, uuid) to anon, authenticated;
