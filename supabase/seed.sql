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
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Ojo de Bife a la Leña', 'Corte jugoso de bife ancho cocido a la leña de quebracho con chimichurri casero y papas rústicas al romero.', 21.00, '/brasa/e0722e989e.png', true),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tacos de Asado al Carbón', 'Carne asada a la brasa sobre tortillas de maíz azul, cebolla asada, cilantro y salsa tatemada.', 14.50, '/brasa/f452e4a8af.png', true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Calamares Fritos', 'Con alioli casero.', 7.50, '/brasa/calamares-fritos.png', true),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Ceviche de Corvina', 'Leche de tigre, choclo, camote.', 8.00, '/brasa/ceviche-corvina.png', false)
on conflict do nothing;
