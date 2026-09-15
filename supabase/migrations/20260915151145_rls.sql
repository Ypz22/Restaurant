alter table restaurants enable row level security;
alter table tables enable row level security;
alter table table_sessions enable row level security;
alter table diners enable row level security;
alter table menu_categories enable row level security;
alter table dishes enable row level security;
alter table order_rounds enable row level security;
alter table cart_items enable row level security;
alter table table_requests enable row level security;

create policy "public read restaurants" on restaurants for select using (true);
create policy "public read tables" on tables for select using (true);
create policy "public read table_sessions" on table_sessions for select using (true);
create policy "public read diners" on diners for select using (true);
create policy "public read menu_categories" on menu_categories for select using (true);
create policy "public read dishes" on dishes for select using (true);
create policy "public read order_rounds" on order_rounds for select using (true);
create policy "public read cart_items" on cart_items for select using (true);
create policy "public read table_requests" on table_requests for select using (true);

revoke insert, update, delete on
  restaurants, tables, table_sessions, diners, menu_categories,
  dishes, order_rounds, cart_items, table_requests
from anon, authenticated;
