insert into restaurants (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'Sabor & Brasa', 'sabor-brasa')
on conflict (id) do nothing;

insert into tables (id, restaurant_id, label, qr_token)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Mesa 04',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Parrilla & Cortes', 1),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Entradas', 2)
on conflict (id) do nothing;

insert into dishes (restaurant_id, category_id, name, description, price, photo_url, is_available) values
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Ojo de Bife a la Leña', 'Corte de 420 g madurado durante 28 días, cocinado lentamente a la leña y acompañado de chimichurri casero emulsionado con aceite de oliva virgen extra.', 21.00, '/brasa/e0722e989e.png', true),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tacos de Asado al Carbón', 'Carne asada a la brasa sobre tortillas de maíz azul, cebolla asada, cilantro y salsa tatemada.', 14.50, '/brasa/f452e4a8af.png', true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Calamares Fritos', 'Con alioli casero.', 7.50, '/brasa/calamares-fritos.png', true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Ceviche de Corvina', 'Leche de tigre, choclo, camote.', 8.00, '/brasa/ceviche-corvina.png', false)
on conflict do nothing;


-- Detalle de demostración del corte.
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
