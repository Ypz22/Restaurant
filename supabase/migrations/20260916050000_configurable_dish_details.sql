-- Detalles por plato. Se conserva el acceso del admin de demostración
-- autorizado para esta etapa; toda escritura se limita al restaurant_id.
create function valid_dish_detail_sections(p_sections jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  s jsonb;
  i jsonb;
  section_ids text[] := '{}';
  item_ids text[];
  notes_count int := 0;
  item_price numeric;
begin
  if jsonb_typeof(p_sections) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sections) > 20 then return false; end if;
  for s in select value from jsonb_array_elements(p_sections) loop
    if jsonb_typeof(s) is distinct from 'object'
      or jsonb_typeof(s->'id') is distinct from 'string'
      or coalesce(length(s->>'id'), 0) not between 1 and 100
      or (s->>'id') = any(section_ids)
      or jsonb_typeof(s->'title') is distinct from 'string'
      or coalesce(length(trim(s->>'title')), 0) not between 1 and 100
      or coalesce(s->>'kind', '') not in ('characteristics', 'ingredients', 'single', 'multiple', 'text', 'notes')
      or jsonb_typeof(s->'required') is distinct from 'boolean'
      or jsonb_typeof(s->'body') is distinct from 'string'
      or length(s->>'body') > 1000
      or jsonb_typeof(s->'items') is distinct from 'array'
    then return false; end if;
    section_ids := array_append(section_ids, s->>'id');
    if s->>'kind' = 'notes' then notes_count := notes_count + 1; end if;
    if notes_count > 1 then return false; end if;
    if s->>'kind' in ('text', 'notes') then
      if jsonb_array_length(s->'items') <> 0 then return false; end if;
      if s->>'kind' = 'text' and length(trim(s->>'body')) = 0 then return false; end if;
    elsif jsonb_array_length(s->'items') not between 1 and 30 then return false;
    end if;
    if (s->>'required')::boolean and s->>'kind' not in ('single', 'multiple', 'notes') then return false; end if;
    item_ids := '{}';
    for i in select value from jsonb_array_elements(s->'items') loop
      if jsonb_typeof(i) is distinct from 'object'
        or jsonb_typeof(i->'id') is distinct from 'string'
        or coalesce(length(i->>'id'), 0) not between 1 and 100
        or (i->>'id') = any(item_ids)
        or jsonb_typeof(i->'label') is distinct from 'string'
        or coalesce(length(trim(i->>'label')), 0) not between 1 and 100
        or jsonb_typeof(i->'description') is distinct from 'string'
        or length(i->>'description') > 300
        or jsonb_typeof(i->'value') is distinct from 'string'
        or length(i->>'value') > 100
        or coalesce(i->>'icon', '') not in ('portion', 'fire', 'calendar', 'time', 'leaf', 'info')
        or jsonb_typeof(i->'price') is distinct from 'number'
        or jsonb_typeof(i->'recommended') is distinct from 'boolean'
      then return false; end if;
      item_ids := array_append(item_ids, i->>'id');
      item_price := (i->>'price')::numeric;
      if item_price < 0 or item_price > 999999 or item_price <> round(item_price, 2) then return false; end if;
      if s->>'kind' not in ('single', 'multiple') and item_price <> 0 then return false; end if;
      if s->>'kind' = 'characteristics' and length(trim(i->>'value')) = 0 then return false; end if;
    end loop;
  end loop;
  return true;
end;
$$;

alter table dishes add column detail_sections jsonb not null default '[]'::jsonb
  check (valid_dish_detail_sections(detail_sections));

-- Se reemplaza la firma anterior para que no exista una vía que ignore
-- las secciones. Omitir el parámetro conserva las de un plato existente.
drop function rpc_admin_upsert_dish(uuid, uuid, uuid, text, text, numeric, text, boolean);
create function rpc_admin_upsert_dish(
  p_restaurant_id uuid, p_id uuid, p_category_id uuid, p_name text,
  p_description text, p_price numeric, p_photo_url text, p_is_available boolean,
  p_detail_sections jsonb default null
)
returns dishes language plpgsql security definer set search_path = public as $$
declare v_row dishes;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'invalid_dish_name'; end if;
  if p_price is null or p_price < 0 then raise exception 'invalid_price'; end if;
  if p_detail_sections is not null and not valid_dish_detail_sections(p_detail_sections) then
    raise exception 'invalid_detail_sections';
  end if;
  if not exists (select 1 from menu_categories where id = p_category_id and restaurant_id = p_restaurant_id) then
    raise exception 'invalid_category';
  end if;
  if p_id is null then
    insert into dishes (restaurant_id, category_id, name, description, price, photo_url, is_available, detail_sections)
      values (p_restaurant_id, p_category_id, p_name, coalesce(p_description, ''), p_price, p_photo_url,
        coalesce(p_is_available, true), coalesce(p_detail_sections, '[]'::jsonb)) returning * into v_row;
  else
    update dishes set category_id = p_category_id, name = p_name, description = coalesce(p_description, ''),
      price = p_price, photo_url = p_photo_url, is_available = coalesce(p_is_available, is_available),
      detail_sections = coalesce(p_detail_sections, detail_sections)
      where id = p_id and restaurant_id = p_restaurant_id returning * into v_row;
    if v_row.id is null then raise exception 'dish_not_found'; end if;
  end if;
  return v_row;
end;
$$;
grant execute on function rpc_admin_upsert_dish(uuid, uuid, uuid, text, text, numeric, text, boolean, jsonb) to anon, authenticated;

drop function rpc_add_cart_item(uuid, uuid, int, text);
create function rpc_add_cart_item(
  p_device_token uuid, p_dish_id uuid, p_quantity int,
  p_notes text default '', p_selections jsonb default '{}'::jsonb
)
returns cart_items language plpgsql security definer set search_path = public as $$
declare
  v_diner_id uuid;
  v_session_id uuid;
  v_restaurant_id uuid;
  v_dish dishes;
  v_price numeric;
  v_row cart_items;
  s jsonb;
  i jsonb;
  choices jsonb;
  choice text;
  selection_key text;
  selected_labels text[];
  v_notes text := '';
begin
  select d.id, d.table_session_id into v_diner_id, v_session_id from diners d where d.device_token = p_device_token;
  if v_diner_id is null then raise exception 'invalid_device_token'; end if;
  select t.restaurant_id into v_restaurant_id from table_sessions ts join tables t on t.id = ts.table_id
    where ts.id = v_session_id and ts.status = 'open' for share of ts;
  if v_restaurant_id is null then raise exception 'session_closed'; end if;
  select * into v_dish from dishes where id = p_dish_id and restaurant_id = v_restaurant_id for share;
  if v_dish.id is null then raise exception 'dish_not_found'; end if;
  if not v_dish.is_available then raise exception 'dish_unavailable'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid_quantity'; end if;
  if length(coalesce(p_notes, '')) > 140 then raise exception 'notes_too_long'; end if;
  if jsonb_typeof(p_selections) is distinct from 'object' then raise exception 'invalid_selections'; end if;
  -- Solo se aceptan identificadores de secciones seleccionables del plato.
  for selection_key in select jsonb_object_keys(p_selections) loop
    if not exists (select 1 from jsonb_array_elements(v_dish.detail_sections) e
      where e->>'id' = selection_key and e->>'kind' in ('single', 'multiple')) then
      raise exception 'invalid_selections';
    end if;
  end loop;
  v_price := v_dish.price;
  for s in select value from jsonb_array_elements(v_dish.detail_sections) loop
    if s->>'kind' = 'notes' and (s->>'required')::boolean and length(trim(coalesce(p_notes, ''))) = 0 then
      raise exception 'required_notes';
    end if;
    if s->>'kind' not in ('single', 'multiple') then continue; end if;
    choices := coalesce(p_selections->(s->>'id'), '[]'::jsonb);
    if jsonb_typeof(choices) is distinct from 'array' then raise exception 'invalid_selections'; end if;
    if exists (select 1 from jsonb_array_elements(choices) c where jsonb_typeof(c) <> 'string') then raise exception 'invalid_selections'; end if;
    if (s->>'required')::boolean and jsonb_array_length(choices) = 0 then raise exception 'required_selection'; end if;
    if s->>'kind' = 'single' and jsonb_array_length(choices) > 1 then raise exception 'invalid_selections'; end if;
    if (select count(distinct value) from jsonb_array_elements_text(choices)) <> jsonb_array_length(choices) then
      raise exception 'invalid_selections';
    end if;
    for choice in select value from jsonb_array_elements_text(choices) loop
      if not exists (select 1 from jsonb_array_elements(s->'items') e where e->>'id' = choice) then
        raise exception 'invalid_selections';
      end if;
    end loop;
    selected_labels := '{}';
    for i in select value from jsonb_array_elements(s->'items') loop
      if choices ? (i->>'id') then
        v_price := v_price + (i->>'price')::numeric;
        selected_labels := array_append(selected_labels, i->>'label');
      end if;
    end loop;
    if cardinality(selected_labels) > 0 then
      v_notes := concat_ws(E'\n', nullif(v_notes, ''), (s->>'title') || ': ' || array_to_string(selected_labels, ', '));
    end if;
  end loop;
  v_notes := concat_ws(E'\n', nullif(v_notes, ''), nullif(trim(coalesce(p_notes, '')), ''));
  insert into cart_items (table_session_id, dish_id, diner_id, quantity, notes, unit_price_snapshot)
    values (v_session_id, p_dish_id, v_diner_id, p_quantity, v_notes, v_price) returning * into v_row;
  return v_row;
end;
$$;
grant execute on function rpc_add_cart_item(uuid, uuid, int, text, jsonb) to anon, authenticated;

-- Contenido de demostración suministrado en la referencia del usuario.
-- Solo este plato recibe datos; el resto se configura desde el editor.
update dishes set detail_sections = '[
  {"id":"characteristics","kind":"characteristics","title":"Características del plato","required":false,"body":"","items":[
    {"id":"portion","label":"Porción","value":"420 g","description":"","icon":"portion","price":0,"recommended":false},
    {"id":"fire","label":"Fuego","value":"A la leña","description":"","icon":"fire","price":0,"recommended":false},
    {"id":"aging","label":"Maduración","value":"28 días dry","description":"","icon":"calendar","price":0,"recommended":false},
    {"id":"wait","label":"Espera","value":"~ 25 minutos","description":"","icon":"time","price":0,"recommended":false}]},
  {"id":"ingredients","kind":"ingredients","title":"Ingredientes principales","required":false,"body":"","items":[
    {"id":"beef","label":"Carne de res angus","value":"","description":"","icon":"info","price":0,"recommended":false},
    {"id":"chimichurri","label":"Chimichurri","value":"","description":"","icon":"info","price":0,"recommended":false},
    {"id":"garlic","label":"Ajo asado","value":"","description":"","icon":"info","price":0,"recommended":false},
    {"id":"parsley","label":"Perejil fresco","value":"","description":"","icon":"info","price":0,"recommended":false},
    {"id":"oil","label":"Aceite de oliva","value":"","description":"","icon":"info","price":0,"recommended":false},
    {"id":"salt","label":"Sal en escamas","value":"","description":"","icon":"info","price":0,"recommended":false}]},
  {"id":"cooking","kind":"single","title":"Término de cocción","required":true,"body":"","items":[
    {"id":"medium","label":"Término medio","description":"Centro rojo tibio, jugoso y tierno","value":"","icon":"info","price":0,"recommended":true},
    {"id":"three-quarters","label":"Tres cuartos","description":"Punto sellado con centro rosado suave","value":"","icon":"info","price":0,"recommended":false},
    {"id":"well-done","label":"Bien cocido","description":"Cocción completa sin presencia de jugo rojo","value":"","icon":"info","price":0,"recommended":false}]},
  {"id":"extras","kind":"multiple","title":"Acompañamientos y extras","required":false,"body":"","items":[
    {"id":"potatoes","label":"Papas rústicas al romero","description":"Horneadas con sal marina","value":"","icon":"info","price":2.5,"recommended":false},
    {"id":"vegetables","label":"Vegetales a la parrilla","description":"Zanahoria baby, calabacín y morrón","value":"","icon":"info","price":2,"recommended":false},
    {"id":"sauce","label":"Chimichurri extra de la casa","description":"Cazoleta adicional de 60 ml","value":"","icon":"info","price":1,"recommended":false}]},
  {"id":"notes","kind":"notes","title":"Notas para la cocina","required":false,"body":"Ej. Sin ajo en el aliño, poca sal marina, salsa aparte…","items":[]}
]'::jsonb
where name = 'Ojo de Bife a la Leña'
  and restaurant_id = (select id from restaurants where slug = 'sabor-brasa');
