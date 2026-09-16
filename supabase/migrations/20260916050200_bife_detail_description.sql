-- La descripción de la referencia incluye chimichurri; las papas son
-- un acompañamiento opcional con precio, no parte del plato base.
update dishes set description = 'Corte de 420 g madurado durante 28 días, cocinado lentamente a la leña y acompañado de chimichurri casero emulsionado con aceite de oliva virgen extra.'
where name = 'Ojo de Bife a la Leña'
  and restaurant_id = (select id from restaurants where slug = 'sabor-brasa');
