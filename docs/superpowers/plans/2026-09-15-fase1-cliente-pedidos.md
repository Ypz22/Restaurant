# Fase 1 — Flujo Cliente (Pedidos por Mesa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, desde un repositorio vacío, la superficie cliente completa de la plataforma de pedidos: escaneo de QR → apodo → menú → carrito grupal en tiempo real → envío de pedido → confirmación → llamar mesero, sobre Next.js (App Router) y Supabase (Postgres + Realtime), inspirada visualmente en las pantallas de referencia de Stitch (tema "Savor & Spice", Material Design 3, Plus Jakarta Sans).

**Architecture:** Un proyecto Next.js con la ruta `/r/[restaurantSlug]/mesa/[tableId]` como única superficie de esta fase. Todo el acceso a datos de sesión/carrito pasa por funciones Postgres `SECURITY DEFINER` (RPC vía `supabase-js`) que validan un `device_token` de capability — nunca por RLS-por-usuario, porque no hay login de cliente. Las tablas tienen RLS con política de **lectura pública** (el UUID no adivinable actúa como capability, igual que un enlace "cualquiera con el link") pero **sin políticas de escritura**, de modo que Realtime (`postgres_changes`) funciona con la `anon key` sin necesitar auth, y toda mutación queda centralizada y validada en las funciones RPC. El panel admin, KDS y dashboard quedan fuera de esta fase (planes separados).

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres, Realtime, CLI local), `@supabase/supabase-js`, Vitest + Testing Library (unit/integración), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-09-09-nucleo-plataforma-restaurantes-design.md`

## Global Constraints

- Sin login de cliente: el único dato de identidad es un apodo capturado en Bienvenida (spec: "Origen del pedido").
- Carrito grupal por `table_session_id`, sincronizado por Supabase Realtime entre todos los dispositivos de la mesa (spec: "Carrito grupal por mesa").
- `cart_items.unit_price_snapshot` se fija al agregar el ítem y nunca cambia con el precio del plato (spec: "Precio del plato al momento de pedir").
- El paso `in_cart` → `submitted` debe ser una única transacción atómica que evite rondas duplicadas o ítems huérfanos (spec: "Envíos simultáneos del carrito").
- Reconexión de Realtime: al reconectar, se repide el estado completo del carrito, no solo eventos nuevos (spec: "Reconexión tras caída de red").
- Solicitudes de mesa duplicadas (ej. llamar mesero) no crean una segunda fila si ya hay una `pending` del mismo tipo (spec: "Solicitudes duplicadas").
- Plato marcado `is_available = false` se propaga por Realtime y debe verse deshabilitado en el cliente (spec: "Plato agotado").
- Requiere Docker + Supabase CLI corriendo localmente (`supabase start`) para ejecutar migraciones y tests de integración.
- Node.js 20+, npm como gestor de paquetes.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, tailwind.config.ts, vitest.config.ts, playwright.config.ts
app/
  layout.tsx
  globals.css
  r/[restaurantSlug]/mesa/[tableId]/
    page.tsx                    # Bienvenida (apodo) / resume de sesión
    menu/page.tsx                # Menú interactivo + Buscador del Menú
    menu/[dishId]/page.tsx        # Detalle de Plato
    orden/page.tsx                # Mi Orden (ver pedido) + estado vacío
    orden/confirmado/page.tsx      # Pedido Confirmado
lib/
  supabase/client.ts             # cliente supabase-js singleton (anon key)
  session/device-token.ts         # helpers localStorage device_token
  data/table.ts                   # wrapper rpc_get_table
  data/session.ts                  # wrappers rpc_start_session / rpc_resume_session
  data/menu.ts                     # select directo categorías + platos
  data/cart.ts                     # wrappers add/update/remove/getCart
  data/orders.ts                   # wrapper rpc_submit_order_round
  data/requests.ts                  # wrapper rpc_create_table_request
  types/database.ts                 # tipos TS de filas/objetos RPC
hooks/
  use-cart-realtime.ts
  use-dish-availability-realtime.ts
components/
  nickname-form.tsx
  category-tabs.tsx
  dish-card.tsx
  dish-search-bar.tsx
  cart-item-row.tsx
  quantity-stepper.tsx
  call-waiter-button.tsx
  empty-cart-state.tsx
supabase/
  migrations/*.sql
  seed.sql
tests/
  integration/*.test.ts
  e2e/grupo-pedido.spec.ts
```

---

### Task 1: Scaffold del proyecto Next.js + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.gitignore`, `vitest.config.ts`, `playwright.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: proyecto Next.js ejecutable (`npm run dev`), Vitest configurado (`npm test`), Playwright configurado (`npm run test:e2e`).

- [ ] **Step 1: Crear el proyecto Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```

Cuando pregunte por sobrescribir el directorio no vacío (por `docs/`), confirmar que sí (no toca `docs/`).

- [ ] **Step 2: Instalar dependencias de datos y testing**

```bash
npm install @supabase/supabase-js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

- [ ] **Step 3: Configurar Vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
})
```

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Agregar a `package.json` scripts:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 4: Verificar que el smoke test falla si algo está mal y luego pasa**

Run: `npm test`
Expected: `1 passed` (smoke test PASS confirma que la configuración de Vitest funciona; no hay lógica de producto que probar en fallo aquí).

- [ ] **Step 5: Configurar Playwright**

```bash
npx playwright install --with-deps chromium
```

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:3000' },
})
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Vitest and Playwright"
```

---

### Task 2: Supabase local + cliente supabase-js

**Files:**
- Create: `supabase/config.toml` (generado por CLI)
- Create: `.env.local.example`, `.env.local` (no versionado), `.env.test.local` (no versionado)
- Create: `lib/supabase/client.ts`
- Test: `tests/unit/supabase-client.test.ts`

**Interfaces:**
- Produces: `createClient(): SupabaseClient` en `lib/supabase/client.ts`, usable tanto en Client Components como Server Components.

- [ ] **Step 1: Inicializar Supabase local**

```bash
npx supabase init
npx supabase start
```

Copiar del output (`API URL`, `anon key`) a `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key impreso por supabase start>
```

Crear `.env.local.example` con las mismas claves vacías, y copiar `.env.local` a `.env.test.local` (mismas credenciales locales, usado por los tests de integración).

Agregar a `.gitignore`: `.env.local`, `.env.test.local`.

- [ ] **Step 2: Escribir el test (falla porque `lib/supabase/client.ts` no existe)**

`tests/unit/supabase-client.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@/lib/supabase/client'

describe('supabase client', () => {
  it('creates a client with the configured URL', () => {
    const client = createClient()
    expect(client).toBeTruthy()
    expect((client as any).supabaseUrl).toContain('127.0.0.1:54321')
  })
})
```

- [ ] **Step 2b: Run test para verificar que falla**

Run: `npm test -- supabase-client`
Expected: FAIL — `Cannot find module '@/lib/supabase/client'`

- [ ] **Step 3: Implementar el cliente**

`lib/supabase/client.ts`:
```ts
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!browserClient) {
    browserClient = createSupabaseClient(url, key)
  }
  return browserClient
}
```

- [ ] **Step 4: Run test para verificar que pasa**

Run: `npm test -- supabase-client`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: init local Supabase project and add supabase-js client wrapper"
```

---

### Task 3: Design tokens (tema "Savor & Spice" de Stitch)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx` (importar fuente Plus Jakarta Sans)

**Interfaces:**
- Produces: clases Tailwind `bg-primary`, `text-on-surface`, `rounded-lg`, etc. mapeadas a los tokens del tema Stitch, disponibles para todos los componentes de fases posteriores.

- [ ] **Step 1: Definir tokens en `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #bc4749;
  --color-primary-dark: #a7333b;
  --color-on-primary: #ffffff;
  --color-secondary: #e29578;
  --color-tertiary: #f4a261;
  --color-background: #fdfbf7;
  --color-surface: #f4f1ea;
  --color-surface-elevated: #efece3;
  --color-on-surface: #2c2523;
  --color-outline: #d6cfc7;
}

body {
  background-color: var(--color-background);
  color: var(--color-on-surface);
}
```

- [ ] **Step 2: Extender Tailwind**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'var(--color-primary)', dark: 'var(--color-primary-dark)' },
        onPrimary: 'var(--color-on-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        background: 'var(--color-background)',
        surface: { DEFAULT: 'var(--color-surface)', elevated: 'var(--color-surface-elevated)' },
        onSurface: 'var(--color-on-surface)',
        outline: 'var(--color-outline)',
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      fontFamily: { sans: ['var(--font-plus-jakarta)', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: Cargar la fuente en el layout raíz**

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
})

export const metadata: Metadata = {
  title: 'Pedidos de Mesa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Verificación visual**

Run: `npm run dev` y abrir `http://localhost:3000` — confirmar que el fondo es `#fdfbf7` y la tipografía es Plus Jakarta Sans (inspección visual, no hay assertion automatizada para estilos globales).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Savor & Spice design tokens and Plus Jakarta Sans font"
```

---

### Task 4: Esquema de base de datos (tablas core)

**Files:**
- Create: `supabase/migrations/<timestamp>_schema_core.sql`
- Test: `tests/integration/schema.test.ts`

**Interfaces:**
- Produces: tablas `restaurants`, `tables`, `table_sessions`, `diners`, `menu_categories`, `dishes`, `cart_items`, `order_rounds`, `table_requests`.

- [ ] **Step 1: Generar el archivo de migración**

```bash
npx supabase migration new schema_core
```

Esto crea `supabase/migrations/<timestamp>_schema_core.sql` (el timestamp real lo asigna el CLI).

- [ ] **Step 2: Escribir el esquema**

```sql
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
```

- [ ] **Step 3: Aplicar la migración**

Run: `npx supabase db reset`
Expected: se recrea la base local y aplica la migración sin errores.

- [ ] **Step 4: Escribir el test de integración (falla si las tablas no existen)**

`tests/integration/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('core schema', () => {
  it('has all expected tables reachable via PostgREST', async () => {
    const tables = [
      'restaurants', 'tables', 'table_sessions', 'diners',
      'menu_categories', 'dishes', 'order_rounds', 'cart_items', 'table_requests',
    ]
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1)
      expect(error, `table ${table} should be queryable`).toBeNull()
    }
  })
})
```

- [ ] **Step 5: Run test**

Run: `npm run test:integration -- schema`
Expected: PASS (las 9 tablas responden sin error)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add core database schema migration"
```

---

### Task 5: RLS — lectura pública, sin escritura directa

**Files:**
- Create: `supabase/migrations/<timestamp>_rls.sql`
- Test: `tests/integration/rls.test.ts`

**Interfaces:**
- Produces: garantía de que `anon` puede `SELECT` en todas las tablas core pero no puede `INSERT`/`UPDATE`/`DELETE` directamente (todo pasa por RPC en tasks siguientes).

- [ ] **Step 1: Generar migración**

```bash
npx supabase migration new rls
```

- [ ] **Step 2: Escribir las políticas**

```sql
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
```

- [ ] **Step 3: Escribir el test que confirma lectura pública y escritura bloqueada**

`tests/integration/rls.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('RLS policies', () => {
  it('allows anon to read restaurants', async () => {
    const { error } = await supabase.from('restaurants').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('blocks anon from inserting a restaurant directly', async () => {
    const { error } = await supabase
      .from('restaurants')
      .insert({ name: 'Hack', slug: 'hack-' + Date.now() })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 4: Aplicar y correr el test**

Run: `npx supabase db reset && npm run test:integration -- rls`
Expected: PASS (ambos casos)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: enable RLS with public read and blocked direct writes"
```

---

### Task 6: RPC `rpc_get_table`

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_get_table.sql`
- Create: `lib/data/table.ts`
- Test: `tests/integration/rpc-get-table.test.ts`

**Interfaces:**
- Produces: `getTableByQrToken(qrToken: string): Promise<{ tableId: string; tableLabel: string; restaurantId: string; restaurantName: string; restaurantSlug: string } | null>` en `lib/data/table.ts`.
- Consumes: `createClient()` de Task 2.

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_get_table
```

```sql
create or replace function rpc_get_table(p_qr_token uuid)
returns table (
  table_id uuid,
  table_label text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.label, r.id, r.name, r.slug
  from tables t
  join restaurants r on r.id = t.restaurant_id
  where t.qr_token = p_qr_token;
$$;

grant execute on function rpc_get_table(uuid) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Escribir el test de integración (falla porque `lib/data/table.ts` no existe)**

`tests/integration/rpc-get-table.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getTableByQrToken } from '@/lib/data/table'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let qrToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants')
    .insert({ name: 'Sabor & Brasa', slug: 'sabor-brasa-' + Date.now() })
    .select()
    .single()
  const { data: table } = await admin
    .from('tables')
    .insert({ restaurant_id: restaurant!.id, label: 'Mesa 5' })
    .select()
    .single()
  qrToken = table!.qr_token
})

describe('getTableByQrToken', () => {
  it('returns table and restaurant info for a valid qr_token', async () => {
    const result = await getTableByQrToken(qrToken)
    expect(result?.tableLabel).toBe('Mesa 5')
    expect(result?.restaurantName).toBe('Sabor & Brasa')
  })

  it('returns null for an unknown qr_token', async () => {
    const result = await getTableByQrToken('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })
})
```

Añadir `SUPABASE_SERVICE_ROLE_KEY` (impresa por `supabase start`) a `.env.test.local`.

Run: `npm run test:integration -- rpc-get-table`
Expected: FAIL — `Cannot find module '@/lib/data/table'`

- [ ] **Step 3: Implementar el wrapper**

`lib/data/table.ts`:
```ts
import { createClient } from '@/lib/supabase/client'

export type TableInfo = {
  tableId: string
  tableLabel: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
}

export async function getTableByQrToken(qrToken: string): Promise<TableInfo | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_get_table', { p_qr_token: qrToken })
    .maybeSingle()

  if (error || !data) return null

  return {
    tableId: data.table_id,
    tableLabel: data.table_label,
    restaurantId: data.restaurant_id,
    restaurantName: data.restaurant_name,
    restaurantSlug: data.restaurant_slug,
  }
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-get-table`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rpc_get_table and getTableByQrToken data wrapper"
```

---

### Task 7: RPC `rpc_start_session` y `rpc_resume_session`

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_session.sql`
- Create: `lib/data/session.ts`
- Test: `tests/integration/rpc-session.test.ts`

**Interfaces:**
- Consumes: nada nuevo (usa `createClient()`).
- Produces: `startSession(qrToken: string, nickname: string): Promise<{ tableSessionId: string; dinerId: string; deviceToken: string }>` y `resumeSession(deviceToken: string): Promise<{ tableSessionId: string; dinerId: string; nickname: string; sessionStatus: 'open' | 'closed'; tableLabel: string; restaurantName: string; restaurantSlug: string } | null>` en `lib/data/session.ts`.

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_session
```

```sql
create or replace function rpc_start_session(p_qr_token uuid, p_nickname text)
returns table (
  table_session_id uuid,
  diner_id uuid,
  device_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_id uuid;
  v_session_id uuid;
  v_diner_id uuid;
  v_device_token uuid;
begin
  select id into v_table_id from tables where qr_token = p_qr_token;
  if v_table_id is null then
    raise exception 'invalid_qr_token';
  end if;

  select id into v_session_id from table_sessions
    where table_id = v_table_id and status = 'open'
    limit 1;

  if v_session_id is null then
    insert into table_sessions (table_id, status) values (v_table_id, 'open')
      returning id into v_session_id;
  end if;

  insert into diners (table_session_id, nickname)
    values (v_session_id, p_nickname)
    returning id, device_token into v_diner_id, v_device_token;

  return query select v_session_id, v_diner_id, v_device_token;
end;
$$;

create or replace function rpc_resume_session(p_device_token uuid)
returns table (
  table_session_id uuid,
  diner_id uuid,
  nickname text,
  session_status text,
  table_label text,
  restaurant_name text,
  restaurant_slug text
)
language sql
security definer
set search_path = public
as $$
  select ts.id, d.id, d.nickname, ts.status, t.label, r.name, r.slug
  from diners d
  join table_sessions ts on ts.id = d.table_session_id
  join tables t on t.id = ts.table_id
  join restaurants r on r.id = t.restaurant_id
  where d.device_token = p_device_token;
$$;

grant execute on function rpc_start_session(uuid, text) to anon, authenticated;
grant execute on function rpc_resume_session(uuid) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Test de integración (falla, módulo no existe)**

`tests/integration/rpc-session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { startSession, resumeSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let qrToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants')
    .insert({ name: 'Origen Café', slug: 'origen-' + Date.now() })
    .select()
    .single()
  const { data: table } = await admin
    .from('tables')
    .insert({ restaurant_id: restaurant!.id, label: 'Mesa 2' })
    .select()
    .single()
  qrToken = table!.qr_token
})

describe('session RPCs', () => {
  it('starts a session, then two diners share the same table_session_id', async () => {
    const first = await startSession(qrToken, 'Ana')
    const second = await startSession(qrToken, 'Beto')
    expect(second.tableSessionId).toBe(first.tableSessionId)
    expect(second.dinerId).not.toBe(first.dinerId)
  })

  it('resumes a session by device_token', async () => {
    const started = await startSession(qrToken, 'Caro')
    const resumed = await resumeSession(started.deviceToken)
    expect(resumed?.nickname).toBe('Caro')
    expect(resumed?.sessionStatus).toBe('open')
  })

  it('returns null resuming an unknown device_token', async () => {
    const resumed = await resumeSession('00000000-0000-0000-0000-000000000000')
    expect(resumed).toBeNull()
  })
})
```

Run: `npm run test:integration -- rpc-session`
Expected: FAIL — `Cannot find module '@/lib/data/session'`

- [ ] **Step 3: Implementar wrappers**

`lib/data/session.ts`:
```ts
import { createClient } from '@/lib/supabase/client'

export type StartedSession = {
  tableSessionId: string
  dinerId: string
  deviceToken: string
}

export type ResumedSession = {
  tableSessionId: string
  dinerId: string
  nickname: string
  sessionStatus: 'open' | 'closed'
  tableLabel: string
  restaurantName: string
  restaurantSlug: string
}

export async function startSession(qrToken: string, nickname: string): Promise<StartedSession> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_start_session', { p_qr_token: qrToken, p_nickname: nickname })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'start_session_failed')

  return {
    tableSessionId: data.table_session_id,
    dinerId: data.diner_id,
    deviceToken: data.device_token,
  }
}

export async function resumeSession(deviceToken: string): Promise<ResumedSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_resume_session', { p_device_token: deviceToken })
    .maybeSingle()

  if (error || !data) return null

  return {
    tableSessionId: data.table_session_id,
    dinerId: data.diner_id,
    nickname: data.nickname,
    sessionStatus: data.session_status,
    tableLabel: data.table_label,
    restaurantName: data.restaurant_name,
    restaurantSlug: data.restaurant_slug,
  }
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-session`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rpc_start_session/rpc_resume_session and session data wrappers"
```

---

### Task 8: Seed de datos demo (Sabor & Brasa)

**Files:**
- Create: `supabase/seed.sql`
- Test: `tests/integration/seed.test.ts`

**Interfaces:**
- Produces: 1 restaurante (`sabor-brasa`), 1 mesa, 2+ categorías, 4+ platos disponibles para desarrollo y para el E2E de Task 25.

- [ ] **Step 1: Escribir el seed**

`supabase/seed.sql`:
```sql
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
```

- [ ] **Step 2: Aplicar (el seed corre automáticamente en `db reset`)**

Run: `npx supabase db reset`
Expected: sin errores; el log muestra el seed aplicado.

- [ ] **Step 3: Test de integración**

`tests/integration/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('seed data', () => {
  it('has the demo restaurant with an available and an unavailable dish', async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()
    expect(restaurant).toBeTruthy()

    const { data: dishes } = await supabase
      .from('dishes')
      .select('name, is_available')
      .eq('restaurant_id', restaurant!.id)

    expect(dishes?.some((d) => d.is_available)).toBe(true)
    expect(dishes?.some((d) => !d.is_available)).toBe(true)
  })
})
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- seed`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add demo seed data for Sabor & Brasa"
```

---

### Task 9: `device-token` en localStorage

**Files:**
- Create: `lib/session/device-token.ts`
- Test: `tests/unit/device-token.test.ts`

**Interfaces:**
- Produces: `saveDeviceToken(token: string): void`, `getDeviceToken(): string | null`, `clearDeviceToken(): void` en `lib/session/device-token.ts`.

- [ ] **Step 1: Test (falla, módulo no existe)**

`tests/unit/device-token.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveDeviceToken, getDeviceToken, clearDeviceToken } from '@/lib/session/device-token'

describe('device-token storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing is stored', () => {
    expect(getDeviceToken()).toBeNull()
  })

  it('saves and retrieves a token', () => {
    saveDeviceToken('abc-123')
    expect(getDeviceToken()).toBe('abc-123')
  })

  it('clears the token', () => {
    saveDeviceToken('abc-123')
    clearDeviceToken()
    expect(getDeviceToken()).toBeNull()
  })
})
```

Run: `npm test -- device-token`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`lib/session/device-token.ts`:
```ts
const STORAGE_KEY = 'device_token'

export function saveDeviceToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function getDeviceToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function clearDeviceToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- device-token`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add device_token localStorage helpers"
```

---

### Task 10: Pantalla Bienvenida (apodo / resume)

**Files:**
- Create: `components/nickname-form.tsx`
- Create: `app/r/[restaurantSlug]/mesa/[tableId]/page.tsx`
- Test: `tests/unit/nickname-form.test.tsx`

**Interfaces:**
- Consumes: `getTableByQrToken` (Task 6), `startSession`/`resumeSession` (Task 7), `saveDeviceToken`/`getDeviceToken` (Task 9).
- Produces: componente `NicknameForm` con prop `onSubmit(nickname: string): void`; ruta que redirige a `/r/[restaurantSlug]/mesa/[tableId]/menu` tras unirse.

> Nota de ruteo: `[tableId]` en la URL es el `qr_token` (uuid) de la mesa — es lo que codifica el QR físico. `restaurantSlug` es solo para una URL legible; la resolución real de la mesa siempre se hace vía `qr_token` contra `rpc_get_table`.

- [ ] **Step 1: Test del componente (falla, no existe)**

`tests/unit/nickname-form.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NicknameForm } from '@/components/nickname-form'

describe('NicknameForm', () => {
  it('calls onSubmit with the trimmed nickname', () => {
    const onSubmit = vi.fn()
    render(<NicknameForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/apodo/i), { target: { value: '  Ana  ' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(onSubmit).toHaveBeenCalledWith('Ana')
  })

  it('does not call onSubmit with an empty nickname', () => {
    const onSubmit = vi.fn()
    render(<NicknameForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

Run: `npm test -- nickname-form`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar el componente**

`components/nickname-form.tsx`:
```tsx
'use client'

import { useState } from 'react'

export function NicknameForm({ onSubmit }: { onSubmit: (nickname: string) => void }) {
  const [nickname, setNickname] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="nickname" className="text-title-md font-semibold text-onSurface">
        ¿Cómo te llamamos?
      </label>
      <input
        id="nickname"
        aria-label="Apodo"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Tu apodo"
        className="rounded-md border border-outline bg-surface px-4 py-3 text-onSurface"
      />
      <button
        type="submit"
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary"
      >
        Entrar
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- nickname-form`
Expected: PASS

- [ ] **Step 4: Implementar la página de Bienvenida**

`app/r/[restaurantSlug]/mesa/[tableId]/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { NicknameForm } from '@/components/nickname-form'
import { getTableByQrToken, type TableInfo } from '@/lib/data/table'
import { startSession, resumeSession } from '@/lib/data/session'
import { getDeviceToken, saveDeviceToken, clearDeviceToken } from '@/lib/session/device-token'

export default function BienvenidaPage() {
  const router = useRouter()
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const [table, setTable] = useState<TableInfo | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function init() {
      const existingToken = getDeviceToken()
      if (existingToken) {
        const resumed = await resumeSession(existingToken)
        if (resumed && resumed.sessionStatus === 'open') {
          router.replace(`/r/${resumed.restaurantSlug}/mesa/${params.tableId}/menu`)
          return
        }
        clearDeviceToken()
      }

      const info = await getTableByQrToken(params.tableId)
      setTable(info)
      setChecking(false)
    }
    init()
  }, [params.tableId, router])

  async function handleSubmit(nickname: string) {
    const session = await startSession(params.tableId, nickname)
    saveDeviceToken(session.deviceToken)
    router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)
  }

  if (checking) return null
  if (!table) return <p className="p-6">Mesa no encontrada. Verifica el código QR.</p>

  return (
    <main className="flex min-h-screen flex-col justify-center gap-6 bg-background p-6">
      <div>
        <p className="text-label-md uppercase text-secondary">{table.restaurantName}</p>
        <h1 className="text-headline-md text-onSurface">{table.tableLabel}</h1>
      </div>
      <NicknameForm onSubmit={handleSubmit} />
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Bienvenida screen with nickname join and session resume"
```

---

### Task 11: Data layer del menú

**Files:**
- Create: `lib/data/menu.ts`
- Test: `tests/integration/menu-data.test.ts`

**Interfaces:**
- Produces: `getMenu(restaurantId: string): Promise<{ categories: { id: string; name: string; sortOrder: number }[]; dishes: { id: string; categoryId: string; name: string; description: string; price: number; photoUrl: string | null; isAvailable: boolean }[] }>`.

- [ ] **Step 1: Test (falla, módulo no existe)**

`tests/integration/menu-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getMenu } from '@/lib/data/menu'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('getMenu', () => {
  it('returns categories and dishes for the seeded restaurant', async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()

    const menu = await getMenu(restaurant!.id)

    expect(menu.categories.length).toBeGreaterThanOrEqual(2)
    expect(menu.dishes.length).toBeGreaterThanOrEqual(4)
    expect(menu.dishes[0]).toHaveProperty('isAvailable')
  })
})
```

Run: `npm run test:integration -- menu-data`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`lib/data/menu.ts`:
```ts
import { createClient } from '@/lib/supabase/client'

export type MenuCategory = { id: string; name: string; sortOrder: number }
export type MenuDish = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  photoUrl: string | null
  isAvailable: boolean
}

export async function getMenu(restaurantId: string): Promise<{ categories: MenuCategory[]; dishes: MenuDish[] }> {
  const supabase = createClient()

  const [{ data: categoryRows, error: catError }, { data: dishRows, error: dishError }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
    supabase
      .from('dishes')
      .select('id, category_id, name, description, price, photo_url, is_available')
      .eq('restaurant_id', restaurantId),
  ])

  if (catError || dishError) throw new Error(catError?.message ?? dishError?.message)

  return {
    categories: (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name, sortOrder: c.sort_order })),
    dishes: (dishRows ?? []).map((d) => ({
      id: d.id,
      categoryId: d.category_id,
      name: d.name,
      description: d.description,
      price: Number(d.price),
      photoUrl: d.photo_url,
      isAvailable: d.is_available,
    })),
  }
}
```

- [ ] **Step 3: Run test**

Run: `npm run test:integration -- menu-data`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add getMenu data wrapper"
```

---

### Task 12: Pantalla Menú Interactivo + Categorías

**Files:**
- Create: `components/category-tabs.tsx`
- Create: `components/dish-card.tsx`
- Create: `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`
- Test: `tests/unit/category-tabs.test.tsx`, `tests/unit/dish-card.test.tsx`

**Interfaces:**
- Consumes: `getMenu` (Task 11).
- Produces: `CategoryTabs` (`{ categories, activeId, onSelect }`), `DishCard` (`{ dish, onClick }`).

- [ ] **Step 1: Tests de los componentes (fallan, no existen)**

`tests/unit/category-tabs.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryTabs } from '@/components/category-tabs'

describe('CategoryTabs', () => {
  const categories = [
    { id: 'a', name: 'Parrilla', sortOrder: 1 },
    { id: 'b', name: 'Entradas', sortOrder: 2 },
  ]

  it('highlights the active category and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<CategoryTabs categories={categories} activeId="a" onSelect={onSelect} />)

    const entradasTab = screen.getByRole('button', { name: 'Entradas' })
    fireEvent.click(entradasTab)

    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
```

`tests/unit/dish-card.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishCard } from '@/components/dish-card'

describe('DishCard', () => {
  const dish = {
    id: 'd1', categoryId: 'a', name: 'Ojo de Bife', description: 'A la leña',
    price: 18.5, photoUrl: null, isAvailable: true,
  }

  it('shows name and formatted price, and is clickable', () => {
    const onClick = vi.fn()
    render(<DishCard dish={dish} onClick={onClick} />)

    expect(screen.getByText('Ojo de Bife')).toBeInTheDocument()
    expect(screen.getByText('$18.50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('d1')
  })

  it('shows an unavailable badge and is not clickable when out of stock', () => {
    const onClick = vi.fn()
    render(<DishCard dish={{ ...dish, isAvailable: false }} onClick={onClick} />)

    expect(screen.getByText(/agotado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
```

Run: `npm test -- category-tabs dish-card`
Expected: FAIL — módulos no existen

- [ ] **Step 2: Implementar `CategoryTabs`**

`components/category-tabs.tsx`:
```tsx
type Category = { id: string; name: string; sortOrder: number }

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: Category[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`rounded-full px-4 py-2 text-label-lg whitespace-nowrap ${
            c.id === activeId ? 'bg-primary text-onPrimary' : 'bg-surface text-onSurface'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Implementar `DishCard`**

`components/dish-card.tsx`:
```tsx
import type { MenuDish } from '@/lib/data/menu'

export function DishCard({ dish, onClick }: { dish: MenuDish; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => dish.isAvailable && onClick(dish.id)}
      disabled={!dish.isAvailable}
      className="flex w-full items-center justify-between rounded-lg bg-surface p-4 text-left disabled:opacity-50"
    >
      <div>
        <p className="text-title-md text-onSurface">{dish.name}</p>
        <p className="text-body-md text-onSurface/70">{dish.description}</p>
        {!dish.isAvailable && <p className="text-label-sm uppercase text-primary">Agotado</p>}
      </div>
      <p className="text-title-md font-semibold text-primary">${dish.price.toFixed(2)}</p>
    </button>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- category-tabs dish-card`
Expected: PASS

- [ ] **Step 5: Implementar la página de menú**

`app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CategoryTabs } from '@/components/category-tabs'
import { DishCard } from '@/components/dish-card'
import { getMenu, type MenuCategory, type MenuDish } from '@/lib/data/menu'
import { getTableByQrToken } from '@/lib/data/table'

export default function MenuPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [dishes, setDishes] = useState<MenuDish[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')

  useEffect(() => {
    async function load() {
      const table = await getTableByQrToken(params.tableId)
      if (!table) return
      const menu = await getMenu(table.restaurantId)
      setCategories(menu.categories)
      setDishes(menu.dishes)
      setActiveCategoryId(menu.categories[0]?.id ?? '')
    }
    load()
  }, [params.tableId])

  const visibleDishes = dishes.filter((d) => d.categoryId === activeCategoryId)

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <CategoryTabs categories={categories} activeId={activeCategoryId} onSelect={setActiveCategoryId} />
      <div className="flex flex-col gap-3">
        {visibleDishes.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            onClick={(id) => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu/${id}`)}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Menu Interactivo screen with category tabs and dish cards"
```

---

### Task 13: Buscador del Menú

**Files:**
- Create: `components/dish-search-bar.tsx`
- Modify: `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`
- Test: `tests/unit/dish-search-bar.test.tsx`

**Interfaces:**
- Produces: `DishSearchBar` (`{ value, onChange }`).

- [ ] **Step 1: Test (falla, no existe)**

`tests/unit/dish-search-bar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishSearchBar } from '@/components/dish-search-bar'

describe('DishSearchBar', () => {
  it('calls onChange as the user types', () => {
    const onChange = vi.fn()
    render(<DishSearchBar value="" onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'bife' } })

    expect(onChange).toHaveBeenCalledWith('bife')
  })
})
```

Run: `npm test -- dish-search-bar`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`components/dish-search-bar.tsx`:
```tsx
export function DishSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar en el menú..."
      className="rounded-full border border-outline bg-surface px-4 py-2 text-onSurface"
    />
  )
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- dish-search-bar`
Expected: PASS

- [ ] **Step 4: Integrar en la página de menú**

En `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`, agregar estado y filtrado (el filtro por búsqueda ignora la categoría activa y busca en todo el menú, como en las pantallas Stitch "Buscador del Menú"):

```tsx
// añadir junto a los demás imports
import { DishSearchBar } from '@/components/dish-search-bar'

// dentro del componente, junto a los demás useState
const [query, setQuery] = useState('')

// reemplazar el cálculo de visibleDishes
const visibleDishes = query.trim()
  ? dishes.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))
  : dishes.filter((d) => d.categoryId === activeCategoryId)

// en el JSX, antes de <CategoryTabs .../>
<DishSearchBar value={query} onChange={setQuery} />
{!query.trim() && (
  <CategoryTabs categories={categories} activeId={activeCategoryId} onSelect={setActiveCategoryId} />
)}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add menu search bar"
```

---

### Task 14: Pantalla Detalle de Plato

**Files:**
- Create: `components/quantity-stepper.tsx`
- Create: `app/r/[restaurantSlug]/mesa/[tableId]/menu/[dishId]/page.tsx`
- Test: `tests/unit/quantity-stepper.test.tsx`

**Interfaces:**
- Produces: `QuantityStepper` (`{ value, onChange, min? }`).
- Consumes: `getMenu` (Task 11) para leer el plato por id (filtrando del array de platos ya traído del restaurante).

- [ ] **Step 1: Test (falla, no existe)**

`tests/unit/quantity-stepper.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuantityStepper } from '@/components/quantity-stepper'

describe('QuantityStepper', () => {
  it('increments and decrements, never going below min', () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={1} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: '-' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
```

Run: `npm test -- quantity-stepper`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`components/quantity-stepper.tsx`:
```tsx
export function QuantityStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-surface px-3 py-1">
      <button
        aria-label="-"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="text-title-lg text-primary"
      >
        -
      </button>
      <span className="w-6 text-center text-title-md">{value}</span>
      <button aria-label="+" onClick={() => onChange(value + 1)} className="text-title-lg text-primary">
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- quantity-stepper`
Expected: PASS

- [ ] **Step 4: Implementar la página de Detalle de Plato**

`app/r/[restaurantSlug]/mesa/[tableId]/menu/[dishId]/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuantityStepper } from '@/components/quantity-stepper'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { addCartItem } from '@/lib/data/cart'

export default function DishDetailPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string; dishId: string }>()
  const router = useRouter()
  const [dish, setDish] = useState<MenuDish | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const table = await getTableByQrToken(params.tableId)
      if (!table) return
      const menu = await getMenu(table.restaurantId)
      setDish(menu.dishes.find((d) => d.id === params.dishId) ?? null)
    }
    load()
  }, [params.tableId, params.dishId])

  async function handleAdd() {
    const token = getDeviceToken()
    if (!token || !dish) return
    await addCartItem(token, dish.id, quantity, notes)
    router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden`)
  }

  if (!dish) return null

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <h1 className="text-headline-md text-onSurface">{dish.name}</h1>
      <p className="text-body-lg text-onSurface/80">{dish.description}</p>
      <p className="text-title-lg font-semibold text-primary">${dish.price.toFixed(2)}</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (ej. sin cebolla)"
        className="rounded-md border border-outline bg-surface p-3"
      />
      <QuantityStepper value={quantity} onChange={(v) => setQuantity(Math.max(1, v))} min={1} />
      <button
        onClick={handleAdd}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary"
      >
        Agregar al pedido
      </button>
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Detalle de Plato screen with quantity stepper"
```

---

### Task 15: RPC `rpc_add_cart_item`

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_add_cart_item.sql`
- Create: `lib/data/cart.ts`
- Test: `tests/integration/rpc-add-cart-item.test.ts`

**Interfaces:**
- Produces: `addCartItem(deviceToken: string, dishId: string, quantity: number, notes?: string): Promise<CartItem>` en `lib/data/cart.ts`.
- Este archivo (`lib/data/cart.ts`) se amplía en Tasks 17 y 18 con `getCart`, `updateCartItemQuantity`, `removeCartItem`.

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_add_cart_item
```

```sql
create or replace function rpc_add_cart_item(p_device_token uuid, p_dish_id uuid, p_quantity int, p_notes text default '')
returns cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diner_id uuid;
  v_session_id uuid;
  v_price numeric(10,2);
  v_available boolean;
  v_row cart_items;
begin
  select id, table_session_id into v_diner_id, v_session_id
    from diners where device_token = p_device_token;
  if v_diner_id is null then
    raise exception 'invalid_device_token';
  end if;

  select price, is_available into v_price, v_available from dishes where id = p_dish_id;
  if v_price is null then
    raise exception 'dish_not_found';
  end if;
  if not v_available then
    raise exception 'dish_unavailable';
  end if;
  if p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  insert into cart_items (table_session_id, dish_id, diner_id, quantity, notes, unit_price_snapshot)
    values (v_session_id, p_dish_id, v_diner_id, p_quantity, coalesce(p_notes, ''), v_price)
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function rpc_add_cart_item(uuid, uuid, int, text) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Test de integración (falla, módulo no existe)**

`tests/integration/rpc-add-cart-item.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceToken: string
let availableDishId: string
let unavailableDishId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'Test', slug: 'test-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id,
      name: 'Plato', price: 10, is_available: true,
    }).select().single()
  const { data: outOfStock } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id,
      name: 'Agotado', price: 5, is_available: false,
    }).select().single()

  availableDishId = dish!.id
  unavailableDishId = outOfStock!.id

  const session = await startSession(table!.qr_token, 'Ana')
  deviceToken = session.deviceToken
})

describe('addCartItem', () => {
  it('adds an item and snapshots the current price', async () => {
    const item = await addCartItem(deviceToken, availableDishId, 2, 'sin sal')
    expect(item.quantity).toBe(2)
    expect(item.unitPriceSnapshot).toBe(10)
    expect(item.notes).toBe('sin sal')
  })

  it('rejects adding an unavailable dish', async () => {
    await expect(addCartItem(deviceToken, unavailableDishId, 1)).rejects.toThrow()
  })
})
```

Run: `npm run test:integration -- rpc-add-cart-item`
Expected: FAIL — `Cannot find module '@/lib/data/cart'`

- [ ] **Step 3: Implementar `lib/data/cart.ts` (primera versión, con `addCartItem`)**

`lib/data/cart.ts`:
```ts
import { createClient } from '@/lib/supabase/client'

export type CartItem = {
  id: string
  tableSessionId: string
  dishId: string
  dinerId: string
  quantity: number
  notes: string
  unitPriceSnapshot: number
  status: 'in_cart' | 'submitted'
  orderRoundId: string | null
}

function mapRow(row: any): CartItem {
  return {
    id: row.id,
    tableSessionId: row.table_session_id,
    dishId: row.dish_id,
    dinerId: row.diner_id,
    quantity: row.quantity,
    notes: row.notes,
    unitPriceSnapshot: Number(row.unit_price_snapshot),
    status: row.status,
    orderRoundId: row.order_round_id,
  }
}

export async function addCartItem(
  deviceToken: string,
  dishId: string,
  quantity: number,
  notes = ''
): Promise<CartItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_add_cart_item', {
      p_device_token: deviceToken,
      p_dish_id: dishId,
      p_quantity: quantity,
      p_notes: notes,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'add_cart_item_failed')
  return mapRow(data)
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-add-cart-item`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rpc_add_cart_item and addCartItem wrapper"
```

---

### Task 16: Realtime del carrito + Pantalla Mi Orden (con estado vacío)

**Files:**
- Create: `hooks/use-cart-realtime.ts`
- Create: `components/cart-item-row.tsx`
- Create: `components/empty-cart-state.tsx`
- Create: `lib/data/cart.ts` (ampliar con `getCart`)
- Create: `app/r/[restaurantSlug]/mesa/[tableId]/orden/page.tsx`
- Test: `tests/unit/cart-item-row.test.tsx`, `tests/integration/get-cart.test.ts`

**Interfaces:**
- Consumes: `CartItem` (Task 15).
- Produces: `getCart(tableSessionId: string): Promise<(CartItem & { dishName: string; dinerNickname: string })[]>`, hook `useCartRealtime(tableSessionId: string): { items, loading }` que refresca el estado completo en cada evento y al reconectar (spec: "Reconexión tras caída de red").

- [ ] **Step 1: Test de `getCart` (falla, no existe)**

`tests/integration/get-cart.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getCart, addCartItem } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let tableSessionId: string
let deviceToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'get-cart-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()

  const session = await startSession(table!.qr_token, 'Ana')
  tableSessionId = session.tableSessionId
  deviceToken = session.deviceToken
  await addCartItem(deviceToken, dish!.id, 1)
})

describe('getCart', () => {
  it('returns in-cart items with dish name and diner nickname', async () => {
    const items = await getCart(tableSessionId)
    expect(items).toHaveLength(1)
    expect(items[0].dishName).toBe('Plato')
    expect(items[0].dinerNickname).toBe('Ana')
  })
})
```

Run: `npm run test:integration -- get-cart`
Expected: FAIL — `getCart` no exportado

- [ ] **Step 2: Ampliar `lib/data/cart.ts` con `getCart`**

Agregar al final de `lib/data/cart.ts`:
```ts
export type CartItemWithDetails = CartItem & { dishName: string; dinerNickname: string }

export async function getCart(tableSessionId: string): Promise<CartItemWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, dishes(name), diners(nickname)')
    .eq('table_session_id', tableSessionId)
    .eq('status', 'in_cart')
    .order('created_at')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => ({
    ...mapRow(row),
    dishName: row.dishes.name,
    dinerNickname: row.diners.nickname,
  }))
}
```

- [ ] **Step 3: Run test**

Run: `npm run test:integration -- get-cart`
Expected: PASS

- [ ] **Step 4: Implementar el hook de Realtime**

`hooks/use-cart-realtime.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCart, type CartItemWithDetails } from '@/lib/data/cart'

export function useCartRealtime(tableSessionId: string | null) {
  const [items, setItems] = useState<CartItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tableSessionId) return
    const supabase = createClient()

    async function refresh() {
      const fresh = await getCart(tableSessionId!)
      setItems(fresh)
      setLoading(false)
    }

    const channel = supabase
      .channel(`cart:${tableSessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `table_session_id=eq.${tableSessionId}` },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh()
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableSessionId])

  return { items, loading }
}
```

- [ ] **Step 5: Test de `CartItemRow` (falla, no existe)**

`tests/unit/cart-item-row.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CartItemRow } from '@/components/cart-item-row'

describe('CartItemRow', () => {
  it('shows dish name, nickname, quantity and subtotal', () => {
    render(
      <CartItemRow
        item={{
          id: '1', tableSessionId: 't', dishId: 'd', dinerId: 'din',
          quantity: 2, notes: '', unitPriceSnapshot: 10, status: 'in_cart', orderRoundId: null,
          dishName: 'Ojo de Bife', dinerNickname: 'Ana',
        }}
        onQuantityChange={() => {}}
        onRemove={() => {}}
      />
    )

    expect(screen.getByText('Ojo de Bife')).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
})
```

Run: `npm test -- cart-item-row`
Expected: FAIL — módulo no existe

- [ ] **Step 6: Implementar `CartItemRow`**

`components/cart-item-row.tsx`:
```tsx
import type { CartItemWithDetails } from '@/lib/data/cart'
import { QuantityStepper } from '@/components/quantity-stepper'

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItemWithDetails
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface p-4">
      <div>
        <p className="text-title-md text-onSurface">{item.dishName}</p>
        <p className="text-label-md text-onSurface/60">Agregado por {item.dinerNickname}</p>
      </div>
      <div className="flex items-center gap-4">
        <QuantityStepper
          value={item.quantity}
          min={0}
          onChange={(q) => (q === 0 ? onRemove(item.id) : onQuantityChange(item.id, q))}
        />
        <p className="text-title-md font-semibold text-primary">
          ${(item.quantity * item.unitPriceSnapshot).toFixed(2)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run test**

Run: `npm test -- cart-item-row`
Expected: PASS

- [ ] **Step 8: Implementar `EmptyCartState`**

`components/empty-cart-state.tsx`:
```tsx
export function EmptyCartState({ onBrowseMenu }: { onBrowseMenu: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-headline-md text-onSurface">Tu pedido está vacío</p>
      <p className="text-body-lg text-onSurface/70">Agrega platos del menú para empezar.</p>
      <button onClick={onBrowseMenu} className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary">
        Ver menú
      </button>
    </div>
  )
}
```

- [ ] **Step 9: Implementar la página Mi Orden**

`app/r/[restaurantSlug]/mesa/[tableId]/orden/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import { CartItemRow } from '@/components/cart-item-row'
import { EmptyCartState } from '@/components/empty-cart-state'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { updateCartItemQuantity, removeCartItem } from '@/lib/data/cart'
import { submitOrderRound } from '@/lib/data/orders'

export default function MiOrdenPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const token = getDeviceToken()
      if (!token) {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      const session = await resumeSession(token)
      if (!session || session.sessionStatus !== 'open') {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      setTableSessionId(session.tableSessionId)
    }
    load()
  }, [params.restaurantSlug, params.tableId, router])

  const { items, loading } = useCartRealtime(tableSessionId)
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceSnapshot, 0)

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    const token = getDeviceToken()!
    await updateCartItemQuantity(token, cartItemId, quantity)
  }

  async function handleRemove(cartItemId: string) {
    const token = getDeviceToken()!
    await removeCartItem(token, cartItemId)
  }

  async function handleSubmit() {
    const token = getDeviceToken()!
    await submitOrderRound(token)
    router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden/confirmado`)
  }

  if (loading) return null

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <EmptyCartState onBrowseMenu={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)} />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <h1 className="text-headline-md text-onSurface">Mi Orden</h1>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} onQuantityChange={handleQuantityChange} onRemove={handleRemove} />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-outline pt-4">
        <p className="text-title-lg text-onSurface">Total: ${total.toFixed(2)}</p>
        <button onClick={handleSubmit} className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary">
          Enviar pedido
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add cart realtime hook and Mi Orden screen with empty state"
```

---

### Task 17: RPC `rpc_update_cart_item_quantity` y `rpc_remove_cart_item`

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_cart_mutations.sql`
- Modify: `lib/data/cart.ts`
- Test: `tests/integration/rpc-cart-mutations.test.ts`

**Interfaces:**
- Produces: `updateCartItemQuantity(deviceToken: string, cartItemId: string, quantity: number): Promise<CartItem>`, `removeCartItem(deviceToken: string, cartItemId: string): Promise<void>`.
- Nota de diseño: ambas funciones filtran por `table_session_id` (no por `diner_id`) porque el carrito es grupal — cualquier persona de la mesa puede ajustar o quitar un ítem agregado por otra.

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_cart_mutations
```

```sql
create or replace function rpc_update_cart_item_quantity(p_device_token uuid, p_cart_item_id uuid, p_quantity int)
returns cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_row cart_items;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  update cart_items set quantity = p_quantity
    where id = p_cart_item_id and table_session_id = v_session_id and status = 'in_cart'
    returning * into v_row;

  if v_row.id is null then
    raise exception 'cart_item_not_found';
  end if;

  return v_row;
end;
$$;

create or replace function rpc_remove_cart_item(p_device_token uuid, p_cart_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_deleted uuid;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;

  delete from cart_items
    where id = p_cart_item_id and table_session_id = v_session_id and status = 'in_cart'
    returning id into v_deleted;

  if v_deleted is null then
    raise exception 'cart_item_not_found';
  end if;
end;
$$;

grant execute on function rpc_update_cart_item_quantity(uuid, uuid, int) to anon, authenticated;
grant execute on function rpc_remove_cart_item(uuid, uuid) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Test de integración (falla, funciones no exportadas)**

`tests/integration/rpc-cart-mutations.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem, updateCartItemQuantity, removeCartItem, getCart } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceTokenA: string
let deviceTokenB: string
let tableSessionId: string
let dishId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'mut-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()
  dishId = dish!.id

  const sessionA = await startSession(table!.qr_token, 'Ana')
  deviceTokenA = sessionA.deviceToken
  tableSessionId = sessionA.tableSessionId
  const sessionB = await startSession(table!.qr_token, 'Beto')
  deviceTokenB = sessionB.deviceToken
})

describe('cart mutations', () => {
  it('lets a different diner at the same table update the quantity', async () => {
    const item = await addCartItem(deviceTokenA, dishId, 1)
    const updated = await updateCartItemQuantity(deviceTokenB, item.id, 3)
    expect(updated.quantity).toBe(3)
  })

  it('lets a different diner remove the item, and it disappears from getCart', async () => {
    const item = await addCartItem(deviceTokenA, dishId, 1)
    await removeCartItem(deviceTokenB, item.id)
    const cart = await getCart(tableSessionId)
    expect(cart.find((c) => c.id === item.id)).toBeUndefined()
  })
})
```

Run: `npm run test:integration -- rpc-cart-mutations`
Expected: FAIL — `updateCartItemQuantity`/`removeCartItem` no exportados

- [ ] **Step 3: Ampliar `lib/data/cart.ts`**

Agregar al final de `lib/data/cart.ts`:
```ts
export async function updateCartItemQuantity(
  deviceToken: string,
  cartItemId: string,
  quantity: number
): Promise<CartItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_update_cart_item_quantity', {
      p_device_token: deviceToken,
      p_cart_item_id: cartItemId,
      p_quantity: quantity,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'update_cart_item_failed')
  return mapRow(data)
}

export async function removeCartItem(deviceToken: string, cartItemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_remove_cart_item', {
    p_device_token: deviceToken,
    p_cart_item_id: cartItemId,
  })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-cart-mutations`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cart quantity update and remove RPCs"
```

---

### Task 18: RPC `rpc_submit_order_round` (transacción atómica)

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_submit_order_round.sql`
- Create: `lib/data/orders.ts`
- Test: `tests/integration/rpc-submit-order-round.test.ts`

**Interfaces:**
- Produces: `submitOrderRound(deviceToken: string): Promise<{ id: string; tableSessionId: string; submittedAt: string; status: 'pending' }>`.
- Este es el test de la transacción crítica del spec ("Envíos simultáneos del carrito").

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_submit_order_round
```

```sql
create or replace function rpc_submit_order_round(p_device_token uuid)
returns order_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_round order_rounds;
  v_moved int;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;

  perform 1 from cart_items
    where table_session_id = v_session_id and status = 'in_cart'
    for update;

  if not found then
    raise exception 'empty_cart';
  end if;

  insert into order_rounds (table_session_id, status)
    values (v_session_id, 'pending')
    returning * into v_round;

  update cart_items
    set status = 'submitted', order_round_id = v_round.id
    where table_session_id = v_session_id and status = 'in_cart';

  get diagnostics v_moved = row_count;
  if v_moved = 0 then
    raise exception 'empty_cart';
  end if;

  return v_round;
end;
$$;

grant execute on function rpc_submit_order_round(uuid) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Test de integración (falla, módulo no existe)**

`tests/integration/rpc-submit-order-round.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem, getCart } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'
import { submitOrderRound } from '@/lib/data/orders'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupTableWithDish() {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'submit-' + Date.now() + Math.random() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()
  return { table: table!, dish: dish! }
}

describe('submitOrderRound', () => {
  it('moves in_cart items to submitted under one order_round', async () => {
    const { table, dish } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await addCartItem(session.deviceToken, dish.id, 2)

    const round = await submitOrderRound(session.deviceToken)
    expect(round.status).toBe('pending')

    const remaining = await getCart(session.tableSessionId)
    expect(remaining).toHaveLength(0)

    const { data: submittedItems } = await admin
      .from('cart_items')
      .select('status, order_round_id')
      .eq('table_session_id', session.tableSessionId)
    expect(submittedItems?.every((i) => i.status === 'submitted' && i.order_round_id === round.id)).toBe(true)
  })

  it('rejects submitting an empty cart', async () => {
    const { table } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await expect(submitOrderRound(session.deviceToken)).rejects.toThrow()
  })

  it('under concurrent submits from the same table, only one round is created', async () => {
    const { table, dish } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await addCartItem(session.deviceToken, dish.id, 1)

    const results = await Promise.allSettled([
      submitOrderRound(session.deviceToken),
      submitOrderRound(session.deviceToken),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const { data: rounds } = await admin
      .from('order_rounds')
      .select('id')
      .eq('table_session_id', session.tableSessionId)
    expect(rounds).toHaveLength(1)
  })
})
```

Run: `npm run test:integration -- rpc-submit-order-round`
Expected: FAIL — `Cannot find module '@/lib/data/orders'`

- [ ] **Step 3: Implementar `lib/data/orders.ts`**

```ts
import { createClient } from '@/lib/supabase/client'

export type OrderRound = {
  id: string
  tableSessionId: string
  submittedAt: string
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
}

export async function submitOrderRound(deviceToken: string): Promise<OrderRound> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_submit_order_round', { p_device_token: deviceToken })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'submit_order_round_failed')

  return {
    id: data.id,
    tableSessionId: data.table_session_id,
    submittedAt: data.submitted_at,
    status: data.status,
  }
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-submit-order-round`
Expected: PASS (el caso de concurrencia depende del `for update` bloqueando la segunda llamada hasta que la primera libera el lock; la segunda debe fallar con `empty_cart` porque ya no quedan filas `in_cart`)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add atomic rpc_submit_order_round with row-locking for concurrent submits"
```

---

### Task 19: Pantalla Pedido Confirmado

**Files:**
- Create: `app/r/[restaurantSlug]/mesa/[tableId]/orden/confirmado/page.tsx`
- Test: `tests/unit/pedido-confirmado.test.tsx`

**Interfaces:**
- Consumes: nada nuevo (pantalla estática con navegación).

- [ ] **Step 1: Test (falla, no existe)**

`tests/unit/pedido-confirmado.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ restaurantSlug: 'sabor-brasa', tableId: 'qr-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import PedidoConfirmadoPage from '@/app/r/[restaurantSlug]/mesa/[tableId]/orden/confirmado/page'

describe('PedidoConfirmadoPage', () => {
  it('shows a confirmation message and a link back to the menu', () => {
    render(<PedidoConfirmadoPage />)
    expect(screen.getByText(/pedido enviado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seguir pidiendo/i })).toBeInTheDocument()
  })
})
```

Run: `npm test -- pedido-confirmado`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`app/r/[restaurantSlug]/mesa/[tableId]/orden/confirmado/page.tsx`:
```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'

export default function PedidoConfirmadoPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-headline-md text-onSurface">¡Pedido enviado!</h1>
      <p className="text-body-lg text-onSurface/70">
        La cocina ya recibió tu ronda. Puedes seguir agregando platos para la próxima ronda.
      </p>
      <button
        onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary"
      >
        Seguir pidiendo
      </button>
    </main>
  )
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- pedido-confirmado`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Pedido Confirmado screen"
```

---

### Task 20: RPC `rpc_create_table_request` (llamar mesero, con dedup)

**Files:**
- Create: `supabase/migrations/<timestamp>_rpc_table_request.sql`
- Create: `lib/data/requests.ts`
- Test: `tests/integration/rpc-table-request.test.ts`

**Interfaces:**
- Produces: `createTableRequest(deviceToken: string, type: 'llamar_mesero' | 'agua'): Promise<{ id: string; type: string; status: 'pending' | 'acknowledged' }>`.

- [ ] **Step 1: Migración**

```bash
npx supabase migration new rpc_table_request
```

```sql
create or replace function rpc_create_table_request(p_device_token uuid, p_type text)
returns table_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_row table_requests;
begin
  select table_session_id into v_session_id from diners where device_token = p_device_token;
  if v_session_id is null then
    raise exception 'invalid_device_token';
  end if;
  if p_type not in ('llamar_mesero', 'agua') then
    raise exception 'invalid_request_type';
  end if;

  select * into v_row from table_requests
    where table_session_id = v_session_id and type = p_type and status = 'pending'
    limit 1;

  if v_row.id is not null then
    return v_row;
  end if;

  insert into table_requests (table_session_id, type, status)
    values (v_session_id, p_type, 'pending')
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function rpc_create_table_request(uuid, text) to anon, authenticated;
```

Run: `npx supabase db reset`

- [ ] **Step 2: Test de integración (falla, módulo no existe)**

`tests/integration/rpc-table-request.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTableRequest } from '@/lib/data/requests'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceToken: string
let tableSessionId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'req-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const session = await startSession(table!.qr_token, 'Ana')
  deviceToken = session.deviceToken
  tableSessionId = session.tableSessionId
})

describe('createTableRequest', () => {
  it('creates a pending llamar_mesero request', async () => {
    const req = await createTableRequest(deviceToken, 'llamar_mesero')
    expect(req.status).toBe('pending')
    expect(req.type).toBe('llamar_mesero')
  })

  it('does not create a duplicate pending request of the same type', async () => {
    const first = await createTableRequest(deviceToken, 'agua')
    const second = await createTableRequest(deviceToken, 'agua')
    expect(second.id).toBe(first.id)

    const { data: rows } = await admin
      .from('table_requests')
      .select('id')
      .eq('table_session_id', tableSessionId)
      .eq('type', 'agua')
    expect(rows).toHaveLength(1)
  })
})
```

Run: `npm run test:integration -- rpc-table-request`
Expected: FAIL — `Cannot find module '@/lib/data/requests'`

- [ ] **Step 3: Implementar `lib/data/requests.ts`**

```ts
import { createClient } from '@/lib/supabase/client'

export type TableRequest = {
  id: string
  type: 'llamar_mesero' | 'agua'
  status: 'pending' | 'acknowledged'
}

export async function createTableRequest(
  deviceToken: string,
  type: TableRequest['type']
): Promise<TableRequest> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_create_table_request', { p_device_token: deviceToken, p_type: type })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'create_table_request_failed')

  return { id: data.id, type: data.type, status: data.status }
}
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- rpc-table-request`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rpc_create_table_request with duplicate-request dedup"
```

---

### Task 21: Botón Llamar Camarero

**Files:**
- Create: `components/call-waiter-button.tsx`
- Modify: `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx` (montar el botón flotante)
- Test: `tests/unit/call-waiter-button.test.tsx`

**Interfaces:**
- Consumes: `createTableRequest` (Task 20), `getDeviceToken` (Task 9).
- Produces: `CallWaiterButton` (`{ deviceToken }`), que muestra confirmación tras el click.

- [ ] **Step 1: Test (falla, no existe)**

`tests/unit/call-waiter-button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CallWaiterButton } from '@/components/call-waiter-button'

vi.mock('@/lib/data/requests', () => ({
  createTableRequest: vi.fn().mockResolvedValue({ id: '1', type: 'llamar_mesero', status: 'pending' }),
}))

describe('CallWaiterButton', () => {
  it('shows a confirmation after calling the waiter', async () => {
    render(<CallWaiterButton deviceToken="token-1" />)

    fireEvent.click(screen.getByRole('button', { name: /llamar mesero/i }))

    await waitFor(() => {
      expect(screen.getByText(/mesero en camino/i)).toBeInTheDocument()
    })
  })
})
```

Run: `npm test -- call-waiter-button`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`components/call-waiter-button.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createTableRequest } from '@/lib/data/requests'

export function CallWaiterButton({ deviceToken }: { deviceToken: string }) {
  const [confirmed, setConfirmed] = useState(false)

  async function handleClick() {
    await createTableRequest(deviceToken, 'llamar_mesero')
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 4000)
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 rounded-full bg-primary px-5 py-3 font-semibold text-onPrimary shadow-lg"
    >
      {confirmed ? 'Mesero en camino' : 'Llamar mesero'}
    </button>
  )
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- call-waiter-button`
Expected: PASS

- [ ] **Step 4: Montar el botón en la pantalla de menú**

En `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`, importar `CallWaiterButton` y `getDeviceToken`, y añadir al final del JSX (antes de cerrar `</main>`):
```tsx
{getDeviceToken() && <CallWaiterButton deviceToken={getDeviceToken()!} />}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add floating Llamar Mesero button"
```

---

### Task 22: Realtime de disponibilidad de platos ("86'd")

**Files:**
- Create: `hooks/use-dish-availability-realtime.ts`
- Modify: `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`
- Test: `tests/unit/use-dish-availability-realtime.test.tsx`

**Interfaces:**
- Produces: `useDishAvailabilityRealtime(restaurantId: string | null, initialDishes: MenuDish[]): MenuDish[]` — devuelve la lista de platos con `isAvailable` actualizado en vivo.

- [ ] **Step 1: Test (falla, no existe)**

`tests/unit/use-dish-availability-realtime.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const handlers: Record<string, (payload: any) => void> = {}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: (_event: string, _config: any, cb: (payload: any) => void) => {
        handlers.change = cb
        return { subscribe: (statusCb?: (s: string) => void) => { statusCb?.('SUBSCRIBED'); return {} } }
      },
    }),
    removeChannel: () => {},
  }),
}))

import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'

describe('useDishAvailabilityRealtime', () => {
  it('updates isAvailable when a dish UPDATE event arrives', () => {
    const initial = [{ id: 'd1', categoryId: 'c1', name: 'Plato', description: '', price: 10, photoUrl: null, isAvailable: true }]
    const { result } = renderHook(() => useDishAvailabilityRealtime('r1', initial))

    act(() => {
      handlers.change({ new: { id: 'd1', is_available: false } })
    })

    expect(result.current.find((d) => d.id === 'd1')?.isAvailable).toBe(false)
  })
})
```

Run: `npm test -- use-dish-availability-realtime`
Expected: FAIL — módulo no existe

- [ ] **Step 2: Implementar**

`hooks/use-dish-availability-realtime.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MenuDish } from '@/lib/data/menu'

export function useDishAvailabilityRealtime(restaurantId: string | null, initialDishes: MenuDish[]) {
  const [dishes, setDishes] = useState(initialDishes)

  useEffect(() => {
    setDishes(initialDishes)
  }, [initialDishes])

  useEffect(() => {
    if (!restaurantId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`dishes:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dishes', filter: `restaurant_id=eq.${restaurantId}` },
        (payload: any) => {
          setDishes((prev) =>
            prev.map((d) => (d.id === payload.new.id ? { ...d, isAvailable: payload.new.is_available } : d))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  return dishes
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- use-dish-availability-realtime`
Expected: PASS

- [ ] **Step 4: Integrar en la página de menú**

En `app/r/[restaurantSlug]/mesa/[tableId]/menu/page.tsx`: reemplazar el `useState<MenuDish[]>` de platos y su `setDishes(menu.dishes)` por guardar `restaurantId` en estado y envolver la lista con el hook:

```tsx
// añadir import
import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'

// nuevo estado junto a los demás
const [restaurantId, setRestaurantId] = useState<string | null>(null)
const [initialDishes, setInitialDishes] = useState<MenuDish[]>([])

// en load(), además de setCategories(menu.categories):
setRestaurantId(table.restaurantId)
setInitialDishes(menu.dishes)

// reemplazar el uso de `dishes` en el resto del archivo por:
const dishes = useDishAvailabilityRealtime(restaurantId, initialDishes)
```

Eliminar el `useState` original de `dishes`/`setDishes` para no duplicar la fuente de verdad.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: propagate dish availability changes via realtime"
```

---

### Task 23: E2E — dos comensales en la misma mesa

**Files:**
- Create: `tests/e2e/grupo-pedido.spec.ts`

**Interfaces:**
- Consumes: toda la app construida en Tasks 1–22 y el seed de Task 8.

- [ ] **Step 1: Escribir el test E2E**

`tests/e2e/grupo-pedido.spec.ts`:
```ts
import { test, expect, chromium } from '@playwright/test'

const QR_TOKEN = '33333333-3333-3333-3333-333333333333'
const RESTAURANT_SLUG = 'sabor-brasa'

test('dos comensales de la misma mesa comparten carrito y envían un pedido', async () => {
  const browser = await chromium.launch()
  const contextAna = await browser.newContext()
  const contextBeto = await browser.newContext()
  const pageAna = await contextAna.newPage()
  const pageBeto = await contextBeto.newPage()

  await pageAna.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageAna.getByLabel(/apodo/i).fill('Ana')
  await pageAna.getByRole('button', { name: /entrar/i }).click()
  await pageAna.waitForURL(/\/menu$/)

  await pageBeto.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}`)
  await pageBeto.getByLabel(/apodo/i).fill('Beto')
  await pageBeto.getByRole('button', { name: /entrar/i }).click()
  await pageBeto.waitForURL(/\/menu$/)

  await pageAna.getByText('Ojo de Bife a la Leña').click()
  await pageAna.getByRole('button', { name: /agregar al pedido/i }).click()
  await pageAna.waitForURL(/\/orden$/)

  await pageBeto.goto(`/r/${RESTAURANT_SLUG}/mesa/${QR_TOKEN}/orden`)
  await expect(pageBeto.getByText('Ojo de Bife a la Leña')).toBeVisible({ timeout: 10000 })
  await expect(pageBeto.getByText(/Agregado por Ana/i)).toBeVisible()

  await pageBeto.getByRole('button', { name: /enviar pedido/i }).click()
  await pageBeto.waitForURL(/\/orden\/confirmado$/)
  await expect(pageBeto.getByText(/pedido enviado/i)).toBeVisible()

  await expect(pageAna.getByText(/tu pedido está vacío/i)).toBeVisible({ timeout: 10000 })

  await browser.close()
})
```

- [ ] **Step 2: Levantar Supabase local y correr el E2E**

Run: `npx supabase db reset && npm run test:e2e`
Expected: PASS — confirma sincronización de carrito en tiempo real entre 2 clientes, envío de ronda, y vaciado del carrito visible en el otro dispositivo.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: add E2E for shared cart, order submission, and realtime sync"
```

---

## Próximos pasos (fuera de este plan)

1. Plan separado: panel Admin (login staff, gestión de menú del día, gestión de mesas, cierre manual de `table_session`).
2. Plan separado: KDS de cocina (comandas en tiempo real, cambio de estado `pending`→`preparing`→`ready`→`delivered`).
3. Plan separado: Dashboard de ventas y métricas.
4. Fase 2 (independiente): previsualización 3D/AR de platos.
