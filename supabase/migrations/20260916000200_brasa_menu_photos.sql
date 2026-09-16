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
on conflict (id) do update set label = excluded.label;

insert into menu_categories (id, restaurant_id, name, sort_order) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Parrilla & Cortes', 1),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Entradas', 2),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Pescados', 3),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Carnes & Brasas', 4)
on conflict (id) do update
  set name = excluded.name, sort_order = excluded.sort_order;

update dishes set
  photo_url = '/brasa/e0722e989e.png', price = 21.00,
  description = 'Corte jugoso de bife ancho cocido a la leña de quebracho con chimichurri casero y papas rústicas al romero.'
where restaurant_id = '11111111-1111-1111-1111-111111111111'
  and name = 'Ojo de Bife a la Leña';

update dishes set
  photo_url = '/brasa/f452e4a8af.png', price = 14.50,
  description = 'Carne asada a la brasa sobre tortillas de maíz azul, cebolla asada, cilantro y salsa tatemada.'
where restaurant_id = '11111111-1111-1111-1111-111111111111'
  and name = 'Tacos de Asado al Carbón';

update dishes set photo_url = '/brasa/605f30c1ee.png'
where restaurant_id = '11111111-1111-1111-1111-111111111111'
  and name = 'Calamares Fritos';

update dishes set photo_url = '/brasa/9a64bb9d1b.png'
where restaurant_id = '11111111-1111-1111-1111-111111111111'
  and name = 'Ceviche de Corvina';

insert into dishes (id, restaurant_id, category_id, name, description, price, photo_url, is_available)
select id, '11111111-1111-1111-1111-111111111111'::uuid, category_id, name, description, price, photo_url, true
from (values
  ('88888888-8888-8888-8888-888888888888'::uuid, '77777777-7777-7777-7777-777777777777'::uuid, 'Costillar al Quebracho', 'Cocción lenta de 8 horas con madera noble, miel de caña y romero fresco.', 18.50::numeric, '/brasa/365a2f7b9a.png'),
  ('99999999-9999-9999-9999-999999999999'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'Salmón a la Miel & Romero', 'Salmón fresco glaseado al romero sobre espárragos tiernos y emulsión cítrica.', 19.50::numeric, '/brasa/9a64bb9d1b.png'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'Risotto de Hongos Silvestres', 'Arroz cremoso con setas de temporada y un toque de trufa.', 16.00::numeric, '/brasa/c577b38027.png'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Entraña Fina al Quebracho', 'Corte tierno a fuego vivo con pimientos asados y sal marina.', 26.00::numeric, '/brasa/603f3a607c.png'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Bife de Chorizo Clásico', 'Corte argentino a la parrilla con rúcula y parmesano.', 29.00::numeric, '/brasa/603f3a607c.png')
) as menu(id, category_id, name, description, price, photo_url)
where not exists (
  select 1 from dishes existing
  where existing.restaurant_id = '11111111-1111-1111-1111-111111111111'
    and existing.name = menu.name
)
on conflict (id) do nothing;
