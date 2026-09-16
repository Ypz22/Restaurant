-- Customer data is accessed through device-token RPCs, not public table SELECT.
drop policy if exists "public read tables" on tables;
drop policy if exists "public read table_sessions" on table_sessions;
drop policy if exists "public read diners" on diners;
drop policy if exists "public read order_rounds" on order_rounds;
drop policy if exists "public read cart_items" on cart_items;
drop policy if exists "public read table_requests" on table_requests;

revoke select on tables, table_sessions, diners, order_rounds, cart_items, table_requests
  from anon, authenticated;
