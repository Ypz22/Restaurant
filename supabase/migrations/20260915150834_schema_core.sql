create extension if not exists pgcrypto;

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  label text not null,
  qr_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table diners (
  id uuid primary key default gen_random_uuid(),
  table_session_id uuid not null references table_sessions(id) on delete cascade,
  nickname text not null,
  device_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null,
  photo_url text,
  is_available boolean not null default true,
  has_3d_model boolean not null default false
);

create table order_rounds (
  id uuid primary key default gen_random_uuid(),
  table_session_id uuid not null references table_sessions(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'delivered'))
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  table_session_id uuid not null references table_sessions(id) on delete cascade,
  dish_id uuid not null references dishes(id),
  diner_id uuid not null references diners(id) on delete cascade,
  quantity int not null check (quantity > 0),
  notes text not null default '',
  unit_price_snapshot numeric(10,2) not null,
  status text not null default 'in_cart' check (status in ('in_cart', 'submitted')),
  order_round_id uuid references order_rounds(id),
  created_at timestamptz not null default now()
);

create table table_requests (
  id uuid primary key default gen_random_uuid(),
  table_session_id uuid not null references table_sessions(id) on delete cascade,
  type text not null check (type in ('llamar_mesero', 'agua')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged')),
  created_at timestamptz not null default now()
);
