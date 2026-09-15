-- Register tables that client hooks subscribe to via Supabase Realtime
-- postgres_changes. Without this, the supabase_realtime publication is
-- empty and no change events are ever broadcast, even though RLS and
-- client subscriptions are otherwise correct.
--
-- Scope limited to what this Fase 1 plan actually subscribes to:
--   - cart_items: hooks/use-cart-realtime.ts (Mi Orden shared cart sync)
--   - dishes:     hooks/use-dish-availability-realtime.ts (menu availability)
--
-- order_rounds, table_requests, diners, and table_sessions are
-- intentionally NOT added here: nothing in this plan subscribes to them.
-- KDS and admin realtime are deferred to later plans (see "Próximos
-- pasos" in the fase1-cliente-pedidos plan).

alter publication supabase_realtime add table cart_items;
alter publication supabase_realtime add table dishes;
