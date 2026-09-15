insert into restaurants (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'Sabor & Brasa', 'sabor-brasa')
on conflict (id) do nothing;

insert into tables (id, restaurant_id, label, qr_token)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Mesa 5',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Parrilla & Cortes', 1),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Entradas', 2)
on conflict (id) do nothing;

insert into dishes (restaurant_id, category_id, name, description, price, is_available) values
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Ojo de Bife a la Leña', 'Cocido sobre brasas, con chimichurri.', 18.50, true),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tacos de Asado al Carbón', 'Tres unidades con cilantro y limón.', 9.00, true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Calamares Fritos', 'Con alioli casero.', 7.50, true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Ceviche de Corvina', 'Leche de tigre, choclo, camote.', 8.00, false)
on conflict do nothing;
